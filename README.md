# Terminal Emulator Portfolio - Ushnish Ghosal

A retro-futuristic terminal emulator portfolio website built with React, TypeScript, and Tailwind CSS. Experience a fully interactive command-line interface with authentic CRT effects, boot sequences, and shell-like functionality.

## Features

- **Authentic Terminal Experience**: Full command-line interface with command history, tab completion, and arrow key navigation
- **Retro CRT Effects**: Scanlines, text glow, vignette, and subtle glitch effects for that authentic CRT monitor feel (without disturbing flicker)
- **Voice Cues & Sound Effects**: Retro terminal sounds for keystrokes, commands, errors, and success events (toggle with `sound` command)
- **Boot Sequence**: Linux kernel-style boot animation with audio on initial load
- **Interactive Help**: User-friendly command reference with categories, icons, and helpful tips
- **Mobile Responsive**: Works seamlessly on all devices
- **Command Aliases**: Support for common shell aliases (cls → clear, experience → exp, etc.)

## Available Commands

- `help` - Display all available commands
- `whoami` - About Ushnish Ghosal
- `skills` - Technical skills and expertise
- `exp` / `experience` - Work experience timeline
- `projects` - Featured projects
- `socials` / `contact` - Contact information and social links
- `stars` - GitHub starred repositories (live data)
- `posts` - LinkedIn posts feed
- `resume` - Download resume PDF with progress bar
- `sound` / `audio` - Toggle sound effects on/off
- `clear` / `cls` - Clear terminal screen

### Sound Effects

The terminal includes authentic retro sound effects:
- Keystroke beeps for typing feedback
- Command execution sounds
- Error alerts for invalid commands
- Success chimes for completed actions
- Boot completion sound
- Tab completion feedback
- Clear screen swoosh

Toggle sounds on/off anytime with the `sound` command.

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations (via tailwindcss-animate)

## Getting Started

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   └── terminal/
│       ├── BootSequence.tsx    # Boot animation
│       ├── TerminalPrompt.tsx  # Input prompt
│       └── TerminalOutput.tsx  # Output renderer
├── lib/
│   └── commandParser.tsx       # Command logic
├── pages/
│   └── Index.tsx              # Main terminal page
└── index.css                  # Global styles & CRT effects
```

## Customization

To customize the portfolio for your own use:

1. Update personal information in `src/lib/commandParser.tsx`
2. Replace resume PDF in `public/Ushnish_Ghosal.pdf`
3. Modify color scheme in `src/index.css` (CSS variables)
4. Add/remove commands in the command parser

## Color Scheme

- Background: Deep obsidian (#0a0a0a)
- Primary text: Electric green (#00ff41)
- Accent: Retro amber (#ffa500)
- All colors include authentic CRT glow effects

## License

MIT
