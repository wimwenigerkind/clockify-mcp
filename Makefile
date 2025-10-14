BUILD_DIR=./build
BUILD_INDEX=./build/index.js

.PHONY: build
build:
	npm run build

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)

.PHONY: install
install:
	npm install

.PHONY: lint
lint:
	npm run lint

.PHONY: format
format:
	npm run format

.PHONY: format-check
format-check:
	npm run format:check

.PHONY: license-check
license-check:
	npm run license:check

.PHONY: test
test: build lint format-check license-check
	@echo "All checks passed!"

.PHONY: inspector
inspector: build
	npx @modelcontextprotocol/inspector node $(BUILD_INDEX)

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  make build          - Build the TypeScript project"
	@echo "  make clean          - Remove build directory"
	@echo "  make install        - Install dependencies"
	@echo "  make lint           - Run ESLint"
	@echo "  make format         - Format code with Prettier"
	@echo "  make format-check   - Check code formatting"
	@echo "  make license-check  - Check dependency licenses"
	@echo "  make test           - Run all checks (build, lint, format, license)"
	@echo "  make inspector      - Run MCP Inspector in CLI mode"
	@echo "  make help           - Show this help message"