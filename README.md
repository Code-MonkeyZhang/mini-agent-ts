[English](./README.md) | [中文](./README_CN.md)

# Mini-Agent (TypeScript Edition) Quick Start Guide

> This project is a TypeScript implementation of Minimax's open-source [Mini-Agent](https://github.com/MiniMax-AI/Mini-Agent) project.

This is an AI agent that runs in your terminal (command line), capable of helping you read/write files and execute system commands.

## 🛠️ Step 1: Install Node.js

Copy and run the appropriate command for your system in Terminal/PowerShell:

- **Windows** (PowerShell):
  ```powershell
  winget install -e --id OpenJS.NodeJS.LTS
  ```
- **Mac** (requires Homebrew):
  ```bash
  brew install node
  ```
- **Linux** (Ubuntu/Debian):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs
  ```

_(After installation, close and reopen your terminal, then enter `node -v`. If you see something like `v20.x.x`, it means success.)_

## 📥 Step 2: Download the Code

Execute the following commands in your terminal to clone the project locally:

```bash
# 1. Clone the repository
https://github.com/Code-MonkeyZhang/Mini-Agent-TS.git
# 2. Navigate to the project directory
cd Mini-Agent/Mini-Agent-TS
```

_(If Git is not installed on your computer, Windows users can run `winget install Git.Git`, Mac users run `brew install git`)_

## ⚙️ Step 3: Install & Link

Execute the following two commands sequentially in your terminal to register the `mini-agent-ts` command in your system:

```bash
# 1. Install dependencies
npm install

# 2. Build and link to system commands
npm run build && npm link
```

## 🔑 Step 4: Configure API Key

You need to provide the AI with your credentials.

1. Navigate to the `config` directory under the project folder.
2. Make a copy of `config-example.yaml` and rename it to `config.yaml`:
   ```bash
   cp config/config-example.yaml config/config.yaml
   ```
3. Open `config.yaml` with a text editor or code editor, and modify these key configurations:

```yaml
# config/config.yaml

# Enter your API Key
api_key: "YOUR_API_KEY_HERE" # Replace with your MiniMax API Key

# API endpoint (choose based on your network environment)
api_base: "https://api.minimax.io/anthropic" # For overseas users
# api_base: "https://api.minimaxi.com"        # For users in China

# Model and provider
model: "MiniMax-M2"
provider: "anthropic"
```

## 🚀 Step 5: Run

Everything is ready! Now you can directly enter commands anywhere in your terminal to launch it.

### 1. Basic Execution

Starts in the current directory by default:

```bash
mini-agent-ts
```

### 2. Specify Workspace

You can make the Agent work in a specific directory, so all files it creates will be saved there without cluttering your current folder:

```bash
# Windows
mini-agent-ts --workspace D:\MyProjects\TestAgent

# Mac / Linux
mini-agent-ts -w ./my-workspace
```

You'll see the welcome screen `🤖 Mini Agent`. Now you can give it instructions as if chatting with a person, for example:

> "Please create a file named hello.txt in the current directory containing a poem about programmers."

---

## 👨‍💻 Developer Guide

If you want to participate in development or debug the code, you can use the following commands:

| Command         | Purpose                                                                                     |
| :-------------- | :------------------------------------------------------------------------------------------ |
| `npm run build` | **Build Project**: Compiles TypeScript source code into JavaScript (output to `dist/`).     |
| `npm run dev`   | **Run in Dev Mode**: Uses `tsx` to directly execute source code without manual compilation, ideal for debugging with instant updates. |
| `npm run start` | **Run in Production Mode**: Executes compiled code (requires running `build` first).        |
| `npm test`      | **Run Tests**: Executes Vitest unit tests.                                                  |