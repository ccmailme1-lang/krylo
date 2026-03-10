:root {
  --phosphor-glow: rgba(255, 255, 255, 0.28);
  --mass-200lb: cubic-bezier(0.17, 0.84, 0.44, 1);
}

.perspective-root {
  height: 100vh;
  background: #000;
  perspective: 1400px; /* The Ontological Law */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.base44-grid {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  background-image: 
    linear-gradient(#111 1px, transparent 1px),
    linear-gradient(90deg, #111 1px, transparent 1px);
  background-size: 44px 44px;
  transform: rotateX(60deg); /* Receding floor */
  z-index: 1;
}

.content-stage {
  width: 1400px;
  z-index: 2;
  transform-style: preserve-3d;
}

.signal-node {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #333;
  padding: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 15px var(--phosphor-glow); /* +28% Burn */
  transition: transform 0.2s var(--mass-200lb);
}