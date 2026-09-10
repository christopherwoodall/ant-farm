# ==============================================================================
# Ant Farm - Makefile
# Cross-platform development and build automation
# ==============================================================================

.DEFAULT_GOAL := help

# Executables (can be overridden via environment or CLI args)
NODE ?= node
NPM  ?= npm

.PHONY: help setup install run start dev check test build-win build-mac build-linux build-all clean clean-all

## help: Display this help message and target descriptions (default)
help:
	@echo ""
	@echo "🐜 Ant Farm - Build & Automation System"
	@echo "========================================"
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available Targets:"
	@echo "  help         Display this help message (default)"
	@echo "  setup        Install project dependencies into node_modules (npm install)"
	@echo "  install      Alias for setup"
	@echo "  run          Start the Ant Farm desktop application"
	@echo "  start        Alias for run"
	@echo "  dev          Start the application with DevTools opened"
	@echo "  check        Validate JavaScript syntax across all project files"
	@echo "  test         Alias for check"
	@echo "  build-win    Package standalone desktop app for Windows (x64) into dist/"
	@echo "  build-mac    Package standalone desktop app for macOS (x64 & arm64) into dist/"
	@echo "  build-linux  Package standalone desktop app for Linux (x64) into dist/"
	@echo "  build-all    Package standalone desktop apps for all three OS platforms"
	@echo "  clean        Remove build artifacts (dist/ directory)"
	@echo "  clean-all    Remove build artifacts and node_modules (dist/ and node_modules/)"
	@echo ""
	@echo "Examples:"
	@echo "  make setup       # Install dependencies"
	@echo "  make check       # Validate all source files"
	@echo "  make run         # Launch desktop companion"
	@echo "  make build-win   # Build Windows binary"
	@echo ""

## setup: Install all dependencies into node_modules
setup:
	@echo "📦 Installing Ant Farm dependencies..."
	@$(NPM) install
	@echo "✓ Dependencies installed successfully."

## install: Alias for setup
install: setup

## run: Launch the desktop application
run:
	@echo "🐜 Launching Ant Farm desktop companion..."
	@$(NPM) start

## start: Alias for run
start: run

## dev: Launch the desktop application in developer mode
dev:
	@echo "🐜 Launching Ant Farm in developer mode..."
	@$(NPM) run dev

## check: Validate JS syntax across all project files
check:
	@$(NODE) scripts/check-syntax.js

## test: Alias for check
test: check

## build-win: Package for Windows (x64)
build-win:
	@echo "🪟 Packaging Ant Farm for Windows (x64)..."
	@$(NPM) run build:win
	@echo "✓ Windows build complete: dist/Ant Farm-win32-x64/"

## build-mac: Package for macOS (x64 + arm64)
build-mac:
	@echo "🍎 Packaging Ant Farm for macOS (Universal)..."
	@$(NPM) run build:mac
	@echo "✓ macOS build complete: dist/Ant Farm-darwin-*/"

## build-linux: Package for Linux (x64)
build-linux:
	@echo "🐧 Packaging Ant Farm for Linux (x64)..."
	@$(NPM) run build:linux
	@echo "✓ Linux build complete: dist/Ant Farm-linux-x64/"

## build-all: Package for all operating systems
build-all:
	@echo "🚀 Packaging Ant Farm for all platforms (Windows, macOS, Linux)..."
	@$(NPM) run build:all
	@echo "✓ Multi-platform build complete. Check the dist/ directory."

## clean: Remove dist/ directory
clean:
	@echo "🧹 Removing dist/ directory..."
	@rm -rf dist 2>/dev/null || rmdir /s /q dist 2>nul || true
	@echo "✓ Clean complete."

## clean-all: Remove dist/ and node_modules/
clean-all: clean
	@echo "🧹 Removing node_modules/ directory..."
	@rm -rf node_modules 2>/dev/null || rmdir /s /q node_modules 2>nul || true
	@echo "✓ Full clean complete."
