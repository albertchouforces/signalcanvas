# SignalCanvas

Design & decode messages with drag-and-drop signals on SignalCanvas—your interactive backdrop for creativity and communication.

![SignalCanvas Screenshot](https://raw.githubusercontent.com/albertchouforces/signalcanvas/refs/heads/main/public/images/navcommmast.png)

## About

SignalCanvas is an interactive web application that allows users to arrange naval signal flags on a canvas to create messages. Perfect for maritime enthusiasts, naval history buffs, or anyone looking to learn about naval communication systems.

## Features

- **Interactive Canvas**: Drag and drop signal flags onto a naval communication mast background
- **Extensive Flag Library**: Complete set of international maritime signal flags and pennants
- **Custom Arrangements**: Position flags precisely where you want them
- **Practice Mode**: Test your knowledge with signal flag challenges
- **Export Capability**: Copy your flag arrangements to clipboard as images
- **Responsive Design**: Works on desktop and tablet devices

## How to Use

### Flag Inventory
- Browse through signal flags and pennants in the inventory panel
- Use the search feature to find specific flags by name or keyword
- Click the tabs to switch between flag types

### Canvas Interaction
- Drag flags from the inventory onto the canvas
- Position flags by dragging them around the canvas
- Remove flags by hovering over them and clicking the X button
- Flags automatically flip horizontally when placed on the right side of the mast

### Practice
- Use the practice section to test your knowledge of naval signals
- View hints and reveal answers to learn new signals
- Navigate through randomized practice questions

### Board Management
- Copy your board to clipboard as an image with the "Copy Board" button
- Clear all flags from the board with the "Clear Board" button

## Installation and Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/signalcanvas.git
   cd signalcanvas
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser to `http://localhost:5173`

### Building for Production
```bash
npm run build
# or
yarn build
```

## Technologies Used

- **React**: UI component library
- **TypeScript**: Static typing for better code quality
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Next generation frontend tooling
- **React DnD**: Drag and drop for React
- **html2canvas**: Screenshots of the canvas
- **Lucide**: Modern icon set

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
