# TrustCheck - Deepfake Detection Experience

An interactive public display for detecting deepfakes and misinformation on social media. A usable security project by LMU Munich.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18.17 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd trustcheck
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run the development server**

   ```bash
   pnpm dev
   ```

4. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

To create an optimized production build:

```bash
pnpm build
```

To run the production build locally:

```bash
pnpm start
```

## Project Structure

```
├── app/
│   ├── globals.css       # Global styles and design tokens
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Main application entry point
├── components/
│   ├── intro-screen.tsx      # Welcome screen
│   ├── video-experience.tsx  # Video rating interface
│   ├── feedback-screen.tsx   # Result and feedback display
│   ├── checklist-screen.tsx  # Security tips summary
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── scenarios.ts      # Video scenario data
│   └── utils.ts          # Utility functions
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Radix UI](https://radix-ui.com/) - Accessible primitives
- [Lucide Icons](https://lucide.dev/) - Icon library

## Kiosk Mode

This application is designed for touchscreen kiosk displays. All screens fit within the viewport without scrolling. For fullscreen kiosk deployment, open the browser in fullscreen mode (F11) or use a kiosk browser.

## License

MIT