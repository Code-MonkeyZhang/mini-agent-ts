[English](./README.md) | [中文](./README_CN.md)

# Mini-Agent (TypeScript Edition) Quick Start Guide

> This project is a TypeScript implementation of Minimax's open-source [Mini-Agent](https://github.com/MiniMax-AI/Mini-Agent).

This is an AI agent that runs in your terminal (command line), capable of helping you read/write files and execute system commands.

## 🛠️ Step 1: Install Node.js

Copy and run the corresponding command in your terminal (Terminal/PowerShell) based on your system:

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

Run the following command in your terminal to clone the project locally:

```bash
# 1. Clone the repository
git clone https://github.com/YourUsername/Mini-Agent.git

# 2. Navigate to the project directory
cd Mini-Agent/Mini-Agent-TS
```

_(If Git is not installed on your computer, Windows users can run `winget install Git.Git`, and Mac users can run `brew install git`.)_

## ⚙️ Step 3: Install & Link

Run the following two commands sequentially in your terminal to register the `mini-agent-ts` command in your system:

```bash
# 1. Install dependencies
npm install

# 2. Build and link to system commands
npm run build && npm link
```

## 🔑 Step 4: Configure API Key

You need to provide the AI with your credentials.

1. Navigate to the `config` directory in the project folder.
2. Copy `config-example.yaml` and rename it to `config.yaml`:
   ```bash
   cp config/config-example.yaml config/config.yaml
   ```
3. Open `config.yaml` with a text editor or code editor and modify the following key configurations:

```yaml
# config/config.yaml

# Enter your API Key
api_key: "YOUR_API_KEY_HERE" # Replace with your MiniMax API Key

# API endpoint (choose based on your network environment)
api_base: "https://api.minimax.io/anthropic" # For overseas users
# api_base: "https://api.minimaxi.com"        # For domestic users

# Model and provider
model: "MiniMax-M2"
provider: "anthropic"
```

## 🚀 Step 5: Run

Everything is ready! Now you can start the agent directly from **anywhere** in your terminal.

### 1. Basic Run

Starts in the current directory by default:

```bash
mini-agent-ts
```

### 2. Specify Workspace

You can have the Agent work in a specific directory, ensuring all created files are saved there without cluttering your current folder:

```bash
# Windows
mini-agent-ts --workspace D:\MyProjects\TestAgent

# Mac / Linux
mini-agent-ts -w ./my-workspace
```

You will see the welcome screen `🤖 Mini Agent`. Now you can give it instructions as if chatting with a person, for example:

> "Please create a file named hello.txt in the current directory with a poem about programmers."

---

## 👨‍💻 Developer Guide

If you want to contribute to development or debug the code, you can use the following commands:

| Command          | Purpose                                                                                      |
| :--------------- | :------------------------------------------------------------------------------------------- |
| `npm run build`  | **Build Project**: Compiles TypeScript source code into JavaScript (outputs to `dist/`).     |
| `npm run dev`    | **Run in Dev Mode**: Uses `tsx` to run source code directly without manual compilation; changes take effect immediately—ideal for debugging. |
| `npm run start`  | **Run in Production Mode**: Executes compiled code (requires `build` first).                |
| `npm test`       | **Run Tests**: Executes Vitest unit tests.                                                   |