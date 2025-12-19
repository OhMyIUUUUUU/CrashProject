# AccessPoint (CrashProject)

AccessPoint is a mobile application designed to facilitate crash reporting and emergency assistance. It allows users to report incidents, track cases, receive notifications, and communicate/chat regarding their status.

## Features

- **Crash Reporting**: Easily report incidents with location and details.
- **Real-time Notifications**: Receive updates on report status via push notifications.
- **Location Services**: Automatically detect and include location data (including City) in reports.
- **Chat Support**: Communicate directly with support or responders with real-time messaging and sound alerts.
- **Case Tracking**: Monitor the status of active and past cases.

## Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Styling**: NativeWind / Tailwind CSS
- **Notifications**: Notifee & Expo Notifications

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device (or an emulator)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd CrashProject
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup:**
    Ensure you have a `.env` file configured with your Supabase credentials and other necessary API keys.
    ```
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

## Running the Application

Start the Expo development server:

```bash
npx expo start
```

- **Android**: Press `a` in the terminal to open in an Android emulator or scan the QR code with Expo Go.
- **iOS**: Press `i` in the terminal to open in an iOS simulator or scan the QR code with Expo Go (requires camera app).
- **Web**: Press `w` in the terminal to view in the browser.

## Project Structure

- `app/`: Main application source code (screens, layout).
- `components/`: Reusable UI components.
- `supabase/`: Supabase functions and configuration.
- `assets/`: Images, types, and other static assets.

## Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/improvement`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## License

[MIT](LICENSE)
