import dinAltUrl from "../assets/DINalt.ttf";
import washingtonLogoUrl from "../assets/washington-logo.svg";

const WIDTH = 1920;
const HEIGHT = 1080;
const NAVY = "#10294a";
const TABLE_FILL = "#d9d9d9";
const GRID = "rgba(0, 0, 0, 0.5)";
const WHITE = "#f6f6f3";
const BLACK = "#111111";

let fontLoadPromise = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

async function ensureFontLoaded() {
  if (fontLoadPromise) return fontLoadPromise;
  fontLoadPromise = (async () => {
    const font = new FontFace("DINAlt", `url(${dinAltUrl})`);
    await font.load();
    document.fonts.add(font);
    await document.fonts.load('700 48px "DINAlt"');
  })();
  return fontLoadPromise;
}

function compactDate(value) {
  const [year, month, day] = String(value || "").split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${String(year).slice(-2)}`;
}

function formatDateRange(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return "ALL DATES";
  if (dateFrom && dateTo) return `${compactDate(dateFrom)} - ${compactDate(dateTo)}`;
  if (dateFrom) return `FROM ${compactDate(dateFrom)}`;
  return `THROUGH ${compactDate(dateTo)}`;
}

function sumEntryValues(entry) {
  return Object.values(entry.values || {}).reduce((sum, value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);
}

function formatValue(value) {
  if (!Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function fitFontSize(ctx, text, maxWidth, startSize, minSize) {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `700 ${size}px "DINAlt"`;
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

function drawText(ctx, text, x, y, {
  font = '700 40px "DINAlt"',
  color = BLACK,
  align = "center",
  baseline = "middle",
  maxWidth,
} = {}) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

export async function exportDrillGraphic({
  entries,
  players,
  drills,
  dateFrom,
  dateTo,
}) {
  await ensureFontLoaded();
  const logo = await loadImage(washingtonLogoUrl);

  const totals = new Map();
  for (const player of players) {
    totals.set(player.id, new Map(drills.map((drill) => [drill.id, 0])));
  }

  for (const entry of entries) {
    const playerRow = totals.get(entry.player_id);
    if (!playerRow || !playerRow.has(entry.drill_id)) continue;
    playerRow.set(entry.drill_id, playerRow.get(entry.drill_id) + sumEntryValues(entry));
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas.");

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawText(ctx, "DRILL SCORE REPORT", WIDTH / 2, 105, {
    color: WHITE,
    font: '700 78px "DINAlt"',
  });

  const logoSize = 88;
  ctx.drawImage(logo, WIDTH - 160, 36, logoSize, logoSize);

  const playerCount = Math.max(players.length, 1);
  const drillCount = Math.max(drills.length, 1);
  const tableX = 285;
  const tableY = 234;
  const tableWidth = 1555;
  const availableHeight = 700;
  const headerHeight = Math.max(86, Math.min(120, Math.floor(availableHeight / (playerCount + 1.75))));
  const rowHeight = Math.max(58, Math.min(104, Math.floor((availableHeight - headerHeight) / playerCount)));
  const tableHeight = headerHeight + (rowHeight * playerCount);
  const totalColumns = drillCount + 1;
  const columnWidth = tableWidth / totalColumns;

  ctx.fillStyle = TABLE_FILL;
  ctx.fillRect(tableX, tableY, tableWidth, tableHeight);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);

  for (let column = 1; column < totalColumns; column += 1) {
    const x = tableX + (columnWidth * column);
    ctx.beginPath();
    ctx.moveTo(x, tableY);
    ctx.lineTo(x, tableY + tableHeight);
    ctx.stroke();
  }

  for (let row = 0; row <= playerCount; row += 1) {
    const y = tableY + headerHeight + (rowHeight * row);
    ctx.beginPath();
    ctx.moveTo(tableX, y);
    ctx.lineTo(tableX + tableWidth, y);
    ctx.stroke();
  }

  drills.forEach((drill, index) => {
    const x = tableX + (columnWidth * index) + (columnWidth / 2);
    const maxWidth = columnWidth - 20;
    const fontSize = fitFontSize(ctx, drill.name.toUpperCase(), maxWidth, 34, 16);
    drawText(ctx, drill.name.toUpperCase(), x, tableY + (headerHeight / 2), {
      font: `700 ${fontSize}px "DINAlt"`,
      maxWidth,
    });
  });

  const totalX = tableX + (columnWidth * drillCount) + (columnWidth / 2);
  drawText(ctx, "TOTAL", totalX, tableY + (headerHeight / 2), {
    font: '700 34px "DINAlt"',
    maxWidth: columnWidth - 20,
  });

  players.forEach((player, rowIndex) => {
    const y = tableY + headerHeight + (rowHeight * rowIndex) + (rowHeight / 2);
    const nameSize = fitFontSize(ctx, player.name.toUpperCase(), 240, 34, 17);
    drawText(ctx, player.name.toUpperCase(), 150, y, {
      color: WHITE,
      font: `700 ${nameSize}px "DINAlt"`,
      maxWidth: 250,
    });

    let rowTotal = 0;
    drills.forEach((drill, columnIndex) => {
      const value = totals.get(player.id)?.get(drill.id) || 0;
      rowTotal += value;
      const x = tableX + (columnWidth * columnIndex) + (columnWidth / 2);
      drawText(ctx, formatValue(value), x, y, {
        font: '700 46px "DINAlt"',
      });
    });

    drawText(ctx, formatValue(rowTotal), totalX, y, {
      font: '700 46px "DINAlt"',
    });
  });

  drawText(ctx, formatDateRange(dateFrom, dateTo), WIDTH / 2, HEIGHT - 78, {
    color: WHITE,
    font: '700 40px "DINAlt"',
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `drill-report-${Date.now()}.png`;
  link.click();
}
