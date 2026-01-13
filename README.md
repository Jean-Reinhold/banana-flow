<div align="center">

# 🍌 BananaFlow

**A Visual Node-Based Workflow Editor for AI Image & Text Generation**

*Powered by Google Gemini 3 Pro*

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)

</div>

---

## ✨ Features

- **🎨 Visual Node Editor** — Drag-and-drop nodes to build AI workflows
- **🖼️ Image Generation & Editing** — Generate images from text or edit existing ones
- **📝 Text Generation** — Create text content using Gemini's language capabilities
- **🎬 Video Generation** — (Experimental) Generate videos from images and prompts
- **📦 Preset Templates** — Pre-configured prompts for common tasks (slides, infographics, portraits)
- **💾 Auto-Save Workflows** — Your workflow is automatically saved to browser storage
- **📜 Generation History** — All generated images are stored locally for easy reuse
- **🎛️ Customizable Themes** — Personalize colors, opacity, and connection styles
- **📤 Import/Export** — Save and share workflows as JSON files

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/banana-flow.git
cd banana-flow

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

Enter your **Gemini API Key** directly in the app's top-right input field. The key is stored locally in your browser and never sent to any server except Google's API.

---

## 🧩 Node Types

| Node | Description |
|------|-------------|
| **Text Input** | Enter text to be used as prompts or content |
| **Image Input** | Upload or drag-and-drop images into the workflow |
| **Image Generator/Editor** | Generate new images or edit existing ones using AI |
| **Text Generator** | Generate text content from prompts |
| **Video Generator** | *(Experimental)* Create videos from images and text |
| **Output** | Display the final result of your workflow |
| **Prompt Presets** | Pre-configured AI prompts for specific tasks |

---

## 📁 Project Structure

```
banana-flow/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # Next.js API route for Gemini calls
│   ├── components/
│   │   ├── App.tsx               # Main application component
│   │   ├── Node.tsx              # Draggable node component
│   │   ├── Edge.tsx              # Connection line between nodes
│   │   ├── Sidebar.tsx           # Node palette sidebar
│   │   ├── HistorySidebar.tsx    # Generation history panel
│   │   ├── SettingsPanel.tsx     # Theme and settings modal
│   │   ├── AppModeView.tsx       # Simplified input/output view
│   │   ├── FileUploader.tsx      # Drag-and-drop file upload
│   │   ├── OutputDisplay.tsx     # Result display component
│   │   └── icons.tsx             # SVG icon components
│   ├── services/
│   │   ├── geminiService.ts      # Gemini API client
│   │   └── storageService.ts     # IndexedDB storage for history
│   ├── types.ts                  # TypeScript type definitions
│   ├── presets.ts                # Prompt preset configurations
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── public/                       # Static assets
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 💾 Data Persistence

BananaFlow stores data locally in your browser:

| Data | Storage | Description |
|------|---------|-------------|
| **API Key** | `localStorage` | Your Gemini API key (encrypted by browser) |
| **Workflow** | `localStorage` | Current workflow state (nodes, edges, theme) |
| **History** | `IndexedDB` | Generated images with timestamps (supports large files) |

> **Note:** All data stays in your browser. Nothing is sent to external servers except API calls to Google Gemini.

---

## 🎨 Customization

### Theme Settings

Access the **Settings** panel (⚙️ icon) to customize:

- Canvas background color and image
- Node background color and opacity
- Text and button colors
- Connection line thickness and colors

### Keyboard Shortcuts

Configurable shortcuts are available for common actions like running workflows, saving, and deleting nodes.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) for the AI capabilities
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

<div align="center">

**Built with ❤️ using Next.js and Google Gemini**

</div>
