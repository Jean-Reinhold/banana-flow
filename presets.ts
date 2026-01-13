
import type { NodeInput, NodeOutput } from './types';

interface PresetConfig {
  label: string;
  prompt: string;
  inputs: Omit<NodeInput, 'id'>[];
  outputs: Omit<NodeOutput, 'id'>[];
}

export const PRESET_CONFIGS: Record<string, PresetConfig> = {
    'slide-layout': {
        label: 'Slide Layout Designer',
        prompt: 'Design a professional 16:9 presentation slide layout based on this content. Use a clean, corporate aesthetic with a clear hierarchy of information. Include space for a title, bullet points, and a primary visual. The background should be minimalist and high-contrast. Output as a polished graphic design.',
        inputs: [{ label: 'Content/Sketch', type: 'text' }],
        outputs: [{ label: 'Slide Design', type: 'image' }]
    },
    'data-infographic': {
        label: 'Data to Infographic',
        prompt: 'Convert the provided data or chart description into a sleek, modern infographic slide in 16:9 aspect ratio. Use a professional color palette (blues, teals, grays) and ensure all icons and data points are clearly legible. Style: Minimalist Business Intelligence.',
        inputs: [{ label: 'Data Input', type: 'text' }],
        outputs: [{ label: 'Infographic', type: 'image' }]
    },
    'corporate-branding': {
        label: 'Apply Brand Identity',
        prompt: 'Redesign this slide image to strictly follow a premium corporate brand identity. Ensure a 16:9 aspect ratio. Use professional studio lighting for any products shown, clean sans-serif typography placeholders, and a consistent color scheme derived from the logo or primary input.',
        inputs: [{ label: 'Draft Slide', type: 'image' }, { label: 'Brand Assets', type: 'image' }],
        outputs: [{ label: 'Branded Slide', type: 'image' }]
    },
    'visionary-background': {
        label: 'Pitch Deck Visual',
        prompt: 'Generate a breathtaking, cinematic 16:9 background visual for a pitch deck. The theme is "Future of Technology and Human Connection". Use a shallow depth of field, soft bokeh, and a professional "Apple-style" product photography aesthetic. No text, just pure visual atmosphere.',
        inputs: [{ label: 'Key Concept', type: 'text' }],
        outputs: [{ label: 'Background', type: 'image' }]
    },
    'process-flow': {
        label: 'Process Flow Chart',
        prompt: 'Create a professional 16:9 flow chart or roadmap based on this description. Use connected 3D glassmorphism nodes or clean flat-design steps. The flow should move clearly from left to right. Ensure high clarity and professional business styling.',
        inputs: [{ label: 'Steps Description', type: 'text' }],
        outputs: [{ label: 'Flow Diagram', type: 'image' }]
    },
    'executive-portrait': {
        label: 'Team/Speaker Profile',
        prompt: 'Transform this casual photo into a professional 16:9 speaker profile slide. Place the subject on a clean, blurred office or studio background. Enhance lighting for a "LinkedIn Top Voice" look. Include a side area for name and title text placeholders.',
        inputs: [{ label: 'Portrait', type: 'image' }],
        outputs: [{ label: 'Profile Slide', type: 'image' }]
    },
    'table-to-graphic': {
        label: 'Table to Visual',
        prompt: 'Take this table data and reimagine it as a beautiful 16:9 comparison graphic. Use modern UI elements like progress bars, checkmarks, or comparison columns. Style should be clean, professional, and easy to read during a presentation.',
        inputs: [{ label: 'Table Data', type: 'text' }],
        outputs: [{ label: 'Comparison Slide', type: 'image' }]
    },
    'moodboard-gen': {
        label: 'Presentation Moodboard',
        prompt: 'Generate a 16:9 collage showing the color palette, typography style, and photographic mood for a new presentation deck themed around sustainability and luxury.',
        inputs: [{ label: 'Core Theme', type: 'text' }],
        outputs: [{ label: 'Moodboard', type: 'image' }]
    },
    'enhance-quality-16-9': {
        label: 'Enhance Quality (16:9)',
        prompt: 'Significantly increase the resolution, sharpness, and overall visual quality of this image. Remove artifacts and noise while strictly maintaining a 16:9 aspect ratio. The result should look professional, clear, and high-definition.',
        inputs: [{ label: 'Input Image', type: 'image' }],
        outputs: [{ label: 'Enhanced Image', type: 'image' }]
    },
};
