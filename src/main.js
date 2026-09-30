const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawPlaceholder();
}

function drawPlaceholder() {
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = '#ff8a1f';
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Heisenbug: Keynote in 10', window.innerWidth / 2, window.innerHeight / 2);
  ctx.fillStyle = '#8a8f99';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Kinepolis Antwerp is warming up…', window.innerWidth / 2, window.innerHeight / 2 + 32);
}

window.addEventListener('resize', resize);
resize();
