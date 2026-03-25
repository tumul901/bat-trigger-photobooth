# Deployment Guide

This project includes scripts to automate the deployment of the frontend to the production server.

## Scripts

- **Windows**: `deploy_frontend.bat`
- **Linux**: `deploy_frontend.sh`

### How to use

1. Open a terminal in the project root.
2. Run the deployment script:
   - **Windows**: `.\deploy_frontend.bat`
   - **Linux**: `./deploy_frontend.sh` (You may need to run `chmod +x deploy_frontend.sh` first)

### What the script does

1. Navigates to the `frontend/` directory.
2. Runs `npm run build` to generate the latest production application in the `dist/` folder.
3. Uses `scp` to transfer the `dist/` folder to the target server at `69.164.247.115`.

## Troubleshooting

- **Authentication**: Ensure your SSH keys are correctly set up or be prepared to enter the root password.
- **Node/NPM**: Ensure you have Node.js and NPM installed on the machine running the script.
- **Directory Errors**: Always run the script from the project root.
