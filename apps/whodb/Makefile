IMAGE_TAG ?= $(shell git rev-parse --abbrev-ref HEAD | sed -e 's/[^A-Za-z0-9_.-]/-/g' -e 's/^[.-]*//')-$(shell date +%Y.%-m%d.%H%M%S)
DOCKER_REGISTRY ?= docker.io
DOCKER_USERNAME ?=
IMAGE_NAME ?= whodb
DOCKER_IMAGE := $(DOCKER_REGISTRY)/$(DOCKER_USERNAME)/$(IMAGE_NAME):$(IMAGE_TAG)
DOCKER_PLATFORM ?= linux/amd64
DOCKERFILE ?= core/Dockerfile
BUILD_CONTEXT ?= .
BUILD_PLATFORM ?= cluster-dev
ENABLE_UPX ?= false

.PHONY: require-docker-username docker-image docker-build-push docker-build-push-no-cache whodb-image whodb-build-push

require-docker-username:
	@test -n "$(DOCKER_USERNAME)" || (echo "DOCKER_USERNAME is required. Example: make docker-build-push-no-cache DOCKER_USERNAME=aimerite IMAGE_TAG=\"\$$(git rev-parse --abbrev-ref HEAD | sed -e 's/[^A-Za-z0-9_.-]/-/g' -e 's/^[.-]*//')-\$$(date +%Y.%-m%d.%H%M%S)\"" >&2; exit 1)

docker-image: require-docker-username
	@echo $(DOCKER_IMAGE)

docker-build-push: require-docker-username
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		-f $(DOCKERFILE) \
		--build-arg VERSION=$(IMAGE_TAG) \
		--build-arg PLATFORM=$(BUILD_PLATFORM) \
		--build-arg ENABLE_UPX=$(ENABLE_UPX) \
		-t $(DOCKER_IMAGE) \
		--push \
		$(BUILD_CONTEXT)

docker-build-push-no-cache: require-docker-username
	docker buildx build \
		--no-cache \
		--platform $(DOCKER_PLATFORM) \
		-f $(DOCKERFILE) \
		--build-arg VERSION=$(IMAGE_TAG) \
		--build-arg PLATFORM=$(BUILD_PLATFORM) \
		--build-arg ENABLE_UPX=$(ENABLE_UPX) \
		-t $(DOCKER_IMAGE) \
		--push \
		$(BUILD_CONTEXT)

whodb-image: docker-image

whodb-build-push: docker-build-push
