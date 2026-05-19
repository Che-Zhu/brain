package authlog

import (
	"fmt"
	"log"
	"strings"
)

const prefix = "[auth]"

// SecretMeta describes a secret value without logging its contents.
func SecretMeta(value string) string {
	v := strings.TrimSpace(value)
	if v == "" {
		return "missing"
	}
	return fmt.Sprintf("present len=%d", len(v))
}

// Info logs an auth-process message.
func Info(format string, args ...any) {
	log.Printf(prefix+" "+format, args...)
}

// Warn logs an auth-process warning.
func Warn(format string, args ...any) {
	log.Printf(prefix+" warn "+format, args...)
}
