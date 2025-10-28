# JSON Tree Visualizer (v2)

Improved version with horizontal tree layout (uses dagre for layout), React Flow visualization, Tailwind, and extra features.

## Features
- Paste JSON and generate a horizontal tree (left-to-right) using dagre + React Flow
- Search by JSON path (e.g. `$.user.address.city`) — centers and highlights the node
- Click node to copy its path
- Dark/Light toggle
- Download tree as PNG
- Clear input

## Run locally
1. `npm install`
2. `npm run dev`
3. Open the URL shown by Vite (usually http://localhost:5173/)

If you see an error about missing `@vitejs/plugin-react`, run:
```
npm install --save-dev @vitejs/plugin-react
```
