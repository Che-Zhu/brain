#!/bin/bash

################################################################################
# Continuous Deployment (CD) Script
#
# This script automates the complete release and deployment process for monorepo
# applications. It handles version tagging, GitHub releases, Docker image
# building, and registry publishing.
#
# Working Process:
# 1. Validation & Setup
#    - Validates project name (dynamically discovers apps with Dockerfile)
#    - Checks git repository state and prerequisites
#    - Detects monorepo name from package.json
#    - Validates Dockerfile existence
#
# 2. Version Tag Detection
#    - Checks if current commit is already tagged with a date-based version
#    - If tagged: Uses existing tag and skips tag/release creation
#    - If not tagged: Generates new version tag (YYYYMMDD.N format)
#    - Fetches latest tags from remote to ensure accurate version numbering
#
# 3. Git Tag & GitHub Release (only if commit is not already tagged)
#    - Creates git tag with the version
#    - Pushes tag to remote repository
#    - Creates GitHub release with release notes
#
# 4. Docker Image Build & Push (only if image doesn't exist in registry)
#    - Checks if Docker image tag already exists in registry
#    - If exists: Skips build and push (saves time on retries)
#    - If not exists: Builds Docker image using project's Dockerfile
#    - Tags image with both 'latest' and version tag
#    - Pushes both tags to Docker registry
#
# Features:
# - Automatic version incrementing for same-day releases
# - Prevents duplicate releases for the same commit
# - Skips unnecessary builds if image already exists
# - Allows retrying failed builds without creating duplicate releases
# - Ignores uncommitted changes to cd.sh and dotfiles (.gitignore, etc.)
#
################################################################################
#
# Prerequisites for executing this script:
#
# 1. Git:
#    - Must be in a git repository
#    - Must have a remote named 'origin' configured
#    - Working directory must be clean (uncommitted changes to cd.sh and
#      dotfiles like .gitignore are allowed)
#
# 2. Node.js:
#    - Node.js must be installed and available in PATH
#    - Required to read package.json for monorepo name detection
#
# 3. GitHub CLI (gh):
#    - Must be installed: https://cli.github.com/
#    - Must be authenticated: run 'gh auth login'
#    - Must have permissions to create releases in the repository
#
# 4. Docker:
#    - Docker must be installed and available in PATH
#    - Docker daemon must be running
#    - Must be authenticated with Docker Hub: run 'docker login'
#    - Must have push permissions to the target registry
#
# 5. Project Structure:
#    - Must be run from the monorepo root directory
#    - Must have package.json in the root
#    - Must have apps/{project}/Dockerfile for the specified project
#
# Usage:
#   ./cd.sh <project-name>
#
# Examples:
#   ./cd.sh ui
#   ./cd.sh registry
#
# Valid project names: dynamically discovered from apps/*/Dockerfile
# (currently: ui, registry — add more by adding apps/<name>/Dockerfile)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if project name is provided
if [ -z "$1" ]; then
    error "Usage: $0 <project-name> [release-notes]"
    error "Example: $0 ui 'bump dependencies'"
    error "Docker Hub image: puddlecat/<monorepo-name>-<project> (monorepo name from root package.json)"
    exit 1
fi

PROJECT=$1

# Get current git commit message as default release notes
if [ -z "$2" ]; then
    # Use full commit message (subject + body) if available, fallback to subject only
    COMMIT_MESSAGE=$(git log -1 --pretty=%B 2>/dev/null | head -n 1)
    if [ -z "$COMMIT_MESSAGE" ]; then
        COMMIT_MESSAGE=$(git log -1 --pretty=%s 2>/dev/null)
    fi
    RELEASE_NOTES="${COMMIT_MESSAGE:-Version update}"
else
    RELEASE_NOTES="$2"
fi

# Get the root directory of the monorepo
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository"
    exit 1
fi

# Check if there are uncommitted changes (excluding cd.sh and dotfiles)
UNCOMMITTED_FILES=$(git diff-index --name-only HEAD -- 2>/dev/null | grep -vE "^(cd\.sh$|\..*)" || true)
if [ -n "$UNCOMMITTED_FILES" ]; then
    error "Working directory has uncommitted changes (excluding cd.sh and dotfiles):"
    echo "$UNCOMMITTED_FILES" | sed 's/^/  - /'
    error "Please commit or stash your changes before running CD"
    exit 1
fi

# Check if remote is configured
if ! git remote get-url origin > /dev/null 2>&1; then
    error "No 'origin' remote configured"
    exit 1
fi

# Fetch latest tags from remote to ensure we have up-to-date tag list
info "Fetching latest tags from remote..."
git fetch --tags origin 2>/dev/null || warn "Failed to fetch tags from remote (continuing with local tags)"

# Read package.json to get monorepo name
if [ ! -f "package.json" ]; then
    error "package.json not found in root directory"
    exit 1
fi

# Check if node is available
if ! command -v node > /dev/null 2>&1; then
    error "Node.js is not installed or not in PATH"
    exit 1
fi

MONOREPO_NAME=$(node -p "require('./package.json').name" 2>/dev/null)
if [ -z "$MONOREPO_NAME" ]; then
    error "Could not read non-empty \"name\" from root package.json"
    exit 1
fi
info "Detected monorepo name: $MONOREPO_NAME"

# Discover deployable projects (apps with Dockerfile)
VALID_PROJECTS=""
for dir in apps/*/; do
    name=$(basename "$dir")
    if [ -f "apps/${name}/Dockerfile" ]; then
        VALID_PROJECTS="${VALID_PROJECTS}${name} "
    fi
done
VALID_PROJECTS=$(echo "$VALID_PROJECTS" | xargs)

# Validate project name and set Docker image name
DOCKERFILE="apps/${PROJECT}/Dockerfile"
if [ -f "$DOCKERFILE" ]; then
    DOCKER_IMAGE="puddlecat/${MONOREPO_NAME}-${PROJECT}"
else
    error "Invalid project name: $PROJECT"
    error "Valid projects: $(echo "$VALID_PROJECTS" | sed 's/ /, /g')"
    exit 1
fi

info "Docker image: $DOCKER_IMAGE"
info "Using Dockerfile: $DOCKERFILE"

# Generate date-based version tag prefix with project name
DATE_TAG=$(date +%Y%m%d)
VERSION_PREFIX="${PROJECT}-${DATE_TAG}"

# Check if current commit is already tagged (check before generating new tag)
CURRENT_COMMIT=$(git rev-parse HEAD)
EXISTING_TAG=""

# Check if HEAD is already tagged with a version tag matching today's pattern
EXISTING_TAG=$(git tag --points-at HEAD 2>/dev/null | grep -E "^${VERSION_PREFIX}\." | head -n1)

# Also check if any tag matching our pattern points to this commit (check both local and remote)
if [ -z "$EXISTING_TAG" ]; then
    for tag in $(git tag -l "${VERSION_PREFIX}.*" 2>/dev/null); do
        TAG_COMMIT=$(git rev-parse "$tag" 2>/dev/null)
        if [ "$TAG_COMMIT" = "$CURRENT_COMMIT" ]; then
            EXISTING_TAG="$tag"
            break
        fi
    done
fi

# Check remote tags if still not found
if [ -z "$EXISTING_TAG" ]; then
    for tag in $(git ls-remote --tags origin "${VERSION_PREFIX}.*" 2>/dev/null | sed 's/.*refs\/tags\///'); do
        # Fetch the tag to check its commit
        git fetch origin "refs/tags/$tag:refs/tags/$tag" 2>/dev/null || true
        TAG_COMMIT=$(git rev-parse "$tag" 2>/dev/null)
        if [ "$TAG_COMMIT" = "$CURRENT_COMMIT" ]; then
            EXISTING_TAG="$tag"
            break
        fi
    done
fi

# Initialize SKIP_RELEASE variable
SKIP_RELEASE=false

if [ -n "$EXISTING_TAG" ]; then
    info "Current commit $CURRENT_COMMIT is already tagged as: $EXISTING_TAG"
    info "Skipping tag/release creation, proceeding directly to build/push..."
    VERSION_TAG="$EXISTING_TAG"
    # Extract Docker tag (date.version) from git tag (project-date.version)
    DOCKER_TAG=$(echo "$VERSION_TAG" | sed "s/^${PROJECT}-//")
    SKIP_RELEASE=true
else
    info "Current commit: $CURRENT_COMMIT"
    info "Commit is not tagged, generating new version tag..."
    
    # Find the highest version number for today's date (check both local and remote tags)
    MAX_VERSION=0
    for tag in $(git tag -l "${VERSION_PREFIX}.*" 2>/dev/null | sort -V); do
        VERSION_NUM=$(echo "$tag" | sed "s/${VERSION_PREFIX}\.//")
        if [ "$VERSION_NUM" -gt "$MAX_VERSION" ] 2>/dev/null; then
            MAX_VERSION=$VERSION_NUM
        fi
    done

    # Also check remote tags (in case they exist remotely but not locally)
    for tag in $(git ls-remote --tags origin "${VERSION_PREFIX}.*" 2>/dev/null | sed 's/.*refs\/tags\///' | sort -V); do
        VERSION_NUM=$(echo "$tag" | sed "s/${VERSION_PREFIX}\.//")
        if [ "$VERSION_NUM" -gt "$MAX_VERSION" ] 2>/dev/null; then
            MAX_VERSION=$VERSION_NUM
        fi
    done

    # Increment version number
    NEXT_VERSION=$((MAX_VERSION + 1))
    VERSION_TAG="${VERSION_PREFIX}.${NEXT_VERSION}"
    # Extract Docker tag (date.version) from git tag (project-date.version)
    DOCKER_TAG="${DATE_TAG}.${NEXT_VERSION}"

    info "Generated version tag: $VERSION_TAG"
    info "Docker image tag: $DOCKER_TAG"
    info "Creating new tag and release..."
    SKIP_RELEASE=false

    # Check if tag already exists locally
    if git rev-parse "$VERSION_TAG" > /dev/null 2>&1; then
        error "Tag $VERSION_TAG already exists locally"
        exit 1
    fi

    # Check if tag already exists remotely
    if git ls-remote --tags origin "$VERSION_TAG" | grep -q "$VERSION_TAG"; then
        error "Tag $VERSION_TAG already exists on remote"
        exit 1
    fi

    # Create git tag first
    info "Creating git tag: $VERSION_TAG"
    git tag "$VERSION_TAG"

    # Check if GitHub CLI is available and authenticated
    if ! command -v gh > /dev/null 2>&1; then
        error "GitHub CLI (gh) is not installed or not in PATH"
        error "Please install it from https://cli.github.com/"
        exit 1
    fi

    if ! gh auth status > /dev/null 2>&1; then
        error "GitHub CLI is not authenticated"
        error "Please run: gh auth login"
        exit 1
    fi

    # Push git tag
    info "Pushing git tag to remote..."
    if ! git push origin "$VERSION_TAG"; then
        error "Failed to push git tag"
        # Clean up local tag if push fails
        git tag -d "$VERSION_TAG" 2>/dev/null || true
        exit 1
    fi

    # Create GitHub release
    info "Creating GitHub release..."
    if gh release create "$VERSION_TAG" \
      --title "$VERSION_TAG" \
      --notes "$RELEASE_NOTES" 2>/dev/null; then
        info "Successfully created release: https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/releases/tag/$VERSION_TAG"
    else
        error "GitHub release creation failed"
        warn "Tag $VERSION_TAG was created and pushed, but release creation failed"
        warn "You may need to create the release manually or check GitHub CLI permissions"
        exit 1
    fi
fi

# Check if Docker is available and running
if ! command -v docker > /dev/null 2>&1; then
    error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    error "Docker daemon is not running"
    error "Please start Docker and try again"
    exit 1
fi

# Check if Docker image tag already exists in registry
info "Checking if image ${DOCKER_IMAGE}:${DOCKER_TAG} already exists in registry..."
if docker manifest inspect "${DOCKER_IMAGE}:${DOCKER_TAG}" > /dev/null 2>&1; then
    info "Image ${DOCKER_IMAGE}:${DOCKER_TAG} already exists in registry"
    info "Skipping build and push steps"
else
    info "Image ${DOCKER_IMAGE}:${DOCKER_TAG} not found in registry, proceeding with build..."

    # Build Docker image (after tag and release are created)
    info "Building Docker image..."
    if ! docker build --platform linux/amd64 -t "${DOCKER_IMAGE}:latest" -f "$DOCKERFILE" .; then
        error "Docker build failed"
        if [ "${SKIP_RELEASE}" = "false" ]; then
            warn "Tag $VERSION_TAG and GitHub release were created, but Docker build failed"
        else
            warn "Docker build failed for existing tag $VERSION_TAG"
        fi
        exit 1
    fi

    # Tag the image with version
    info "Tagging image as: $DOCKER_TAG"
    docker tag "${DOCKER_IMAGE}:latest" "${DOCKER_IMAGE}:${DOCKER_TAG}"

    # Push both tags
    info "Pushing latest tag..."
    if ! docker push "${DOCKER_IMAGE}:latest"; then
        error "Failed to push latest tag"
        warn "You may need to authenticate with Docker Hub: docker login"
        exit 1
    fi

    info "Pushing version tag: $DOCKER_TAG"
    if ! docker push "${DOCKER_IMAGE}:${DOCKER_TAG}"; then
        error "Failed to push version tag"
        warn "Latest tag was pushed, but version tag push failed"
        exit 1
    fi
fi

info "Build and release process completed successfully!"
info "Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
info "Git tag: $VERSION_TAG"
