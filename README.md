# Pomodoro Timer

A simple, playful, browser-based Pomodoro timer with Picture-in-Picture support and local persistence.

**Live Demo:** [timer.yamanlabs.com](https://timer.yamanlabs.com)

## Features

- **Work & Break Phases** - Default 25-minute work sessions and 5-minute breaks
- **Picture-in-Picture Mode** - Pin the timer anywhere on your desktop
- **Customizable Settings** - Adjust durations and colors to your preference
- **Drift-Resistant Timer** - Accurate timing even when the tab is backgrounded
- **Keyboard Shortcuts** - Quick access to all controls
- **Local Persistence** - Settings saved to localStorage
- **No Login Required** - Runs entirely in the browser

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `S` | Open Settings |
| `P` | Toggle Picture-in-Picture |
| `Cmd/Ctrl + K` | Show Keyboard Shortcuts |
| `Escape` | Close modal |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/julianyaman/pomodoro-timer.git
cd pomodoro-timer

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Type Checking

```bash
npm run check
```

## Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t pomodoro-timer .

# Run the container
docker run -p 3000:3000 pomodoro-timer
```

The app will be available at `http://localhost:3000`.

### Docker Compose

```yaml
version: '3.8'
services:
  pomodoro:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

## Browser Support

- Chrome/Edge 79+
- Firefox 69+
- Safari 13.1+

**Note:** Picture-in-Picture support varies by browser. The feature is automatically disabled with a tooltip message in unsupported browsers.

## Attribution

The Picture-in-Picture implementation using canvas-to-video streaming is inspired by [Kaiido's StackOverflow answer](https://stackoverflow.com/a/61301293) (Retrieved 2026-02-05, License: CC BY-SA 4.0).

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
