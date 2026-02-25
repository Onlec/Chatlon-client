import React, { useRef, useState, useEffect } from 'react';
import { log } from '../../utils/debug';

function PaintPane() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pencil');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const colors = [
    '#000000', '#808080', '#800000', '#FF0000', '#808000', '#FFFF00', '#008000', '#00FF00',
    '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF00FF', '#FFFFFF', '#C0C0C0',
    '#FF8080', '#FFFF80', '#80FF80', '#00FF80', '#80FFFF', '#8080FF', '#FF80C0', '#FF80FF'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newHistory = canvasHistory.slice(0, historyStep + 1);
    newHistory.push(canvas.toDataURL());
    setCanvasHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = canvasHistory[historyStep - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistoryStep(historyStep - 1);
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pencil' || currentTool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = lineWidth * 3;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'fill') {
      floodFill(pos.x, pos.y, currentColor);
      saveToHistory();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'pencil' || currentTool === 'brush') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
      // Voor shapes: herstel canvas en teken preview
      const img = new Image();
      img.src = canvasHistory[historyStep];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineWidth = lineWidth;

        if (currentTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (currentTool === 'rectangle') {
          ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
        } else if (currentTool === 'circle') {
          const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
          ctx.beginPath();
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      };
    }
  };

  const stopDrawing = () => {
    if (isDrawing && (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser' || 
        currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle')) {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  const floodFill = (x, y, fillColor) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    x = Math.floor(x);
    y = Math.floor(y);
    
    const targetColor = getPixelColor(pixels, x, y, canvas.width);
    const fillColorRGB = hexToRgb(fillColor);
    
    if (colorsMatch(targetColor, fillColorRGB)) return;
    
    const stack = [[x, y]];
    
    while (stack.length > 0) {
      const [currentX, currentY] = stack.pop();
      
      if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height) continue;
      
      const currentColor = getPixelColor(pixels, currentX, currentY, canvas.width);
      
      if (!colorsMatch(currentColor, targetColor)) continue;
      
      setPixelColor(pixels, currentX, currentY, canvas.width, fillColorRGB);
      
      stack.push([currentX + 1, currentY]);
      stack.push([currentX - 1, currentY]);
      stack.push([currentX, currentY + 1]);
      stack.push([currentX, currentY - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const getPixelColor = (pixels, x, y, width) => {
    const index = (y * width + x) * 4;
    return {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
      a: pixels[index + 3]
    };
  };

  const setPixelColor = (pixels, x, y, width, color) => {
    const index = (y * width + x) * 4;
    pixels[index] = color.r;
    pixels[index + 1] = color.g;
    pixels[index + 2] = color.b;
    pixels[index + 3] = 255;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const colorsMatch = (color1, color2) => {
    return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
  };

  return (
    <div className="paint-container">
      {/* Menubar */}
      <div className="paint-menubar">
        <span className="paint-menu-item">Bestand</span>
        <span className="paint-menu-item">Bewerken</span>
        <span className="paint-menu-item">Beeld</span>
        <span className="paint-menu-item">Afbeelding</span>
        <span className="paint-menu-item">Kleuren</span>
        <span className="paint-menu-item">Help</span>
      </div>

      {/* Toolbar */}
      <div className="paint-toolbar">
        <div className="paint-tool-section">
          <button 
            className={`paint-tool-btn ${currentTool === 'pencil' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('pencil')}
            title="Potlood"
          >
            ✏️
          </button>
          <button 
            className={`paint-tool-btn ${currentTool === 'brush' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('brush')}
            title="Kwast"
          >
            🖌️
          </button>
          <button 
            className={`paint-tool-btn ${currentTool === 'fill' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('fill')}
            title="Vullen"
          >
            🪣
          </button>
          <button 
            className={`paint-tool-btn ${currentTool === 'eraser' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="Gum"
          >
            🧹
          </button>
        </div>
        
        <div className="paint-toolbar-separator"></div>
        
        <div className="paint-tool-section">
          <button 
            className={`paint-tool-btn ${currentTool === 'line' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('line')}
            title="Lijn"
          >
            📏
          </button>
          <button 
            className={`paint-tool-btn ${currentTool === 'rectangle' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('rectangle')}
            title="Rechthoek"
          >
            ▭
          </button>
          <button 
            className={`paint-tool-btn ${currentTool === 'circle' ? 'paint-tool-btn--active' : ''}`}
            onClick={() => setCurrentTool('circle')}
            title="Cirkel"
          >
            ⭕
          </button>
        </div>

        <div className="paint-toolbar-separator"></div>

        <div className="paint-tool-section">
          <button className="paint-action-btn" onClick={undo} title="Ongedaan maken">
            ↶
          </button>
          <button className="paint-action-btn" onClick={clearCanvas} title="Wissen">
            🗑️
          </button>
        </div>
      </div>

      <div className="paint-main-area">
        {/* Linker sidebar met extra tools */}
        <div className="paint-sidebar-left">
          <div className="paint-toolbox">
            <div className="paint-toolbox-title">Gereedschap</div>
            <div className="paint-tools-grid">
              <button 
                className={`paint-grid-tool ${currentTool === 'pencil' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('pencil')}
                title="Potlood"
              >
                ✏️
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'brush' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('brush')}
                title="Kwast"
              >
                🖌️
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'fill' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('fill')}
                title="Vullen"
              >
                🪣
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'eraser' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('eraser')}
                title="Gum"
              >
                🧹
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'line' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('line')}
                title="Lijn"
              >
                ─
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'rectangle' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('rectangle')}
                title="Rechthoek"
              >
                ▭
              </button>
              <button 
                className={`paint-grid-tool ${currentTool === 'circle' ? 'paint-grid-tool--selected' : ''}`}
                onClick={() => setCurrentTool('circle')}
                title="Cirkel"
              >
                ○
              </button>
            </div>
          </div>

          {/* Line width selector */}
          <div className="paint-width-selector">
            <div className="paint-toolbox-title">Lijndikte</div>
            <div className="paint-width-options">
              <div 
                className={`paint-width-option ${lineWidth === 1 ? 'paint-width-option--selected' : ''}`}
                onClick={() => setLineWidth(1)}
              >
                <div style={{ height: '1px', backgroundColor: '#000', width: '100%' }}></div>
              </div>
              <div 
                className={`paint-width-option ${lineWidth === 2 ? 'paint-width-option--selected' : ''}`}
                onClick={() => setLineWidth(2)}
              >
                <div style={{ height: '2px', backgroundColor: '#000', width: '100%' }}></div>
              </div>
              <div 
                className={`paint-width-option ${lineWidth === 4 ? 'paint-width-option--selected' : ''}`}
                onClick={() => setLineWidth(4)}
              >
                <div style={{ height: '4px', backgroundColor: '#000', width: '100%' }}></div>
              </div>
              <div 
                className={`paint-width-option ${lineWidth === 6 ? 'paint-width-option--selected' : ''}`}
                onClick={() => setLineWidth(6)}
              >
                <div style={{ height: '6px', backgroundColor: '#000', width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="paint-canvas-container">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="paint-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>

      {/* Color palette */}
      <div className="paint-color-palette">
        <div className="paint-color-current">
          <div className="paint-color-display">
            <div className="paint-color-box" style={{ backgroundColor: currentColor }}></div>
            <span className="paint-color-label">Huidige kleur</span>
          </div>
        </div>
        <div className="paint-color-grid">
          {colors.map((color, index) => (
            <div
              key={index}
              className={`paint-color-swatch ${currentColor === color ? 'paint-color-swatch--selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PaintPane;
