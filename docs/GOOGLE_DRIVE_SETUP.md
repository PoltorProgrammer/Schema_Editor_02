# Google Drive Integration Guide

This guide explains how to use **Google Drive** with the **MediXtract Schema Editor** without requiring any complex API integration or code changes.

## The Strategy: "Drive for Desktop"

Since we are avoiding custom APIs, the solution is to use the official **Google Drive for Desktop** application. This tool mounts your Google Drive as a real folder (usually `G:` drive) on your computer.

### Why this is the best approach?
1.  **No API Keys**: You don't need to set up Google Cloud projects, API keys, or deal with quotas.
2.  **Privacy**: You aren't giving a third-party application permission to read your Drive; you are just using your OS.
3.  **Automatic Sync**: Saving a file in the app instantly saves it to the hard drive, and Google syncs it to the cloud in the background.

## Setup Instructions for the Team

Every team member who needs to collaborate must follow these steps:

### 1. Install Google Drive for Desktop
-   Download it from [google.com/drive/download](https://www.google.com/drive/download/).
-   Install and log in with your Google account.
-   Verify that you can see a new drive (e.g., `G:`) in your File Explorer.

### 2. Set Up the Shared Folder
*(Only one person needs to do this originally)*
-   Create a folder named `projects` in your Google Drive.
-   Move your existing `/projects` subfolders into this new folder.
-   **Share** this folder with your teammates via the Google Drive website.

### 3. Connect the App
1.  Open **MediXtract Schema Editor**.
2.  Click the **Folder Icon** (or "Select Project Folder") in the dashboard.
3.  Navigate to `G:\My Drive\projects`.
4.  Click **Select Folder**.

## How to Collaborate
-   **Opening**: When you open the app, it reads directly from the synchronized folder. You will always see the files currently on your disk.
    -   *Note*: The app remembers your folder location. Next time you open the app, just click the **Reconnect** button to restore access without navigating folders again.
-   **Saving**: When you click "Save Changes", you are writing directly to the `G:` drive file. Google uploads this change immediately.
-   **Updates**: When a teammate saves a file, Google downloads it to your `G:` drive efficiently.

> **Conflict Prevention**: If two people edit the same patient file at the exact same moment, Google Drive usually creates a "Conflicted Copy". To avoid this, coordinate with your team (e.g., "I'm working on Patient 101 right now").

## Offline Mode & Data Reliability

### What happens if I have no internet?
Because we are using **Google Drive for Desktop**, the `G:` drive works exactly like a folder on your computer's hard drive.

1.  **You can keep working**: You can open projects, edit schemas, and click "Save Changes" even without an internet connection.
2.  **Local Mirror**: Your changes are saved instantly to your local disk.
3.  **Automatic Sync**: As soon as you reconnect to the internet, the Google Drive app running in the background will automatically upload your saved changes to the cloud for your team to see.

### Automatic Backups
To prevent data loss during this process, the application has a built-in safety net:
-   **Security Copies**: Every time you save, the app creates a backup in a `security_copies` folder inside your project.
-   **Naming**: Backups are named `[Project]-analysis_data-[Timestamp]-[Nickname].json`.
-   **History**: The app keeps the last **30 versions** of your work personally, ensuring you can always roll back if something goes wrong with the sync or an accidental overwrite.
