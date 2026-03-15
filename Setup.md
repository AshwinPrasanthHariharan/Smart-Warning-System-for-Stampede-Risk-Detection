# Setup Instructions

## Prerequisites

### For Windows Users: Setting Up WSL

If you're using Windows, you'll need to set up Windows Subsystem for Linux (WSL) to run the Linux-based commands in this guide. WSL allows you to run a Linux environment directly on Windows.

1. Open PowerShell or Command Prompt as Administrator.

2. Install WSL by running:

   ```powershell
   wsl --install
   ```

   This command will:
   - Enable the WSL feature
   - Download and install the latest Ubuntu distribution
   - Set Ubuntu as your default WSL distribution

3. Restart your computer if prompted.

4. After restarting, WSL will automatically start and prompt you to create a user account and password for your Linux distribution.

5. Once set up, you can access your Linux environment by:
   - Opening the Start menu and searching for "Ubuntu" (or your installed distribution)
   - Or running `wsl` in PowerShell/Command Prompt

6. In your WSL terminal, you can now follow the rest of these setup instructions.

**Note:** If you encounter issues or want to install a specific Linux distribution, refer to the [official WSL documentation](https://docs.microsoft.com/en-us/windows/wsl/install).

## Installing Pixi

Pixi is a fast, cross-platform package manager and environment manager. To install pixi, run the following command in your terminal:

```bash
curl -fsSL https://pixi.sh/install.sh | bash
```

After installation, restart your terminal or source your shell configuration to make pixi available in your PATH.

## Setting Up the Environment

1. Clone the project repository:

   ```bash
   git clone git@github.com:AshwinPrasanthHariharan/HS202_G18.git
   cd HS202_G18
   ```

2. Install the project dependencies using pixi:

   ```bash
   pixi install
   ```

   This will create a virtual environment and install all required packages as specified in `pixi.toml`.

3. Activate the pixi environment (optional, as pixi commands can run tasks directly):

   ```bash
   pixi shell
   ```

   To deactivate, simply run `exit`.

## Additional Notes

- Ensure you have Python 3.11 or higher installed on your system before installing pixi.
- If you encounter any issues, refer to the [Pixi documentation](https://pixi.sh/) for troubleshooting.
