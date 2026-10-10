// DriveEase - Ultra-Smooth Canvas & SVG Charts Engine (Hi-DPI & Theme-Adaptive)

const Charts = {
  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light' || State.theme === 'light';
    return {
      isLight,
      grid: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
      textMuted: isLight ? '#64748b' : '#94a3b8',
      textPrimary: isLight ? '#0f172a' : '#f8fafc',
      bgHole: isLight ? '#ffffff' : '#0f172a',
      separator: isLight ? '#f1f5f9' : '#0f172a'
    };
  },

  // Setup Hi-DPI 2x Canvas Context
  setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    
    // Get actual layout width
    const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const clientW = canvas.offsetWidth || parentWidth || 300;
    const clientH = canvas.offsetHeight || 180;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = clientW * dpr;
    canvas.height = clientH * dpr;

    ctx.scale(dpr, dpr);
    return { canvas, ctx, width: clientW, height: clientH };
  },

  // Draw mini sparkline curve in KPI card
  drawSparkline(canvasId, dataPoints, color = '#3b82f6') {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;

    ctx.clearRect(0, 0, width, height);

    if (!dataPoints || dataPoints.length < 2) return;

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = (max - min) || 1;

    const paddingX = 4;
    const paddingY = 6;
    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;

    const stepX = usableW / (dataPoints.length - 1);
    const points = dataPoints.map((val, idx) => ({
      x: paddingX + idx * stepX,
      y: paddingY + usableH - ((val - min) / range) * usableH
    }));

    // Draw Gradient Fill under line
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.lineTo(points[0].x, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  // Draw Revenue & Bookings Combo Overview Chart
  drawRevenueChart(canvasId, labels = [], revenueData = [], bookingsData = [], mode = 'both') {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;
    const theme = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 48;
    const paddingBottom = 26;
    const paddingTop = 16;
    const paddingRight = 24;

    const chartWidth = Math.max(10, width - paddingLeft - paddingRight);
    const chartHeight = Math.max(10, height - paddingTop - paddingBottom);

    const maxRev = Math.max(...revenueData, 100000);
    const maxBookings = Math.max(...bookingsData, 10);

    const count = labels.length || 1;
    const stepX = chartWidth / count;
    const barWidth = Math.max(6, Math.min(24, stepX * 0.48));

    // Draw Grid Lines & Y-Axis Labels
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.textMuted;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const revVal = Math.round(maxRev - (maxRev / 4) * i);
      const labelText = revVal >= 100000 ? `₹${(revVal / 100000).toFixed(1)}L` : `₹${(revVal / 1000).toFixed(0)}k`;
      ctx.fillText(labelText, paddingLeft - 8, y + 4);
    }

    // Draw Revenue Bars
    if (mode === 'both' || mode === 'revenue') {
      for (let i = 0; i < count; i++) {
        const x = paddingLeft + i * stepX + (stepX - barWidth) / 2;
        const barH = ((revenueData[i] || 0) / maxRev) * chartHeight;
        const y = height - paddingBottom - barH;

        const grad = ctx.createLinearGradient(0, y, 0, height - paddingBottom);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(1, '#2563eb');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();

        // X Labels
        ctx.fillStyle = theme.textMuted;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        if (i % 2 === 0 || count <= 7) {
          ctx.fillText(labels[i] || '', x + barWidth / 2, height - 6);
        }
      }
    }

    // Draw Bookings Trend Line
    if (mode === 'both' || mode === 'bookings') {
      const points = [];
      for (let i = 0; i < count; i++) {
        const x = paddingLeft + i * stepX + stepX / 2;
        const y = height - paddingBottom - ((bookingsData[i] || 0) / maxBookings) * chartHeight;
        points.push({ x, y });
      }

      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const xc = (points[i].x + points[i - 1].x) / 2;
          const yc = (points[i].y + points[i - 1].y) / 2;
          ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw glowing points
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    }
  },

  // Draw Donut Chart (Car Status / Booking Status)
  drawDonutChart(canvasId, slices = []) {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;
    const theme = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.9;
    const innerRadius = radius * 0.65;

    const total = slices.reduce((sum, s) => sum + (s.count || 0), 0) || 1;
    let startAngle = -Math.PI / 2;

    slices.forEach(slice => {
      const sliceAngle = ((slice.count || 0) / total) * (Math.PI * 2);
      if (sliceAngle <= 0) return;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = slice.color || '#3b82f6';
      ctx.fill();

      // Border separator between slices
      ctx.strokeStyle = theme.separator;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      startAngle = endAngle;
    });
  },

  // Draw User Growth Mini Bar Chart
  drawGrowthChart(canvasId, data = [12, 18, 15, 25, 30, 28, 38, 42, 35, 48, 52, 45, 60, 68]) {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;
    const theme = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const count = data.length || 1;
    const max = Math.max(...data, 10);
    const paddingBottom = 18;
    const usableH = height - paddingBottom;
    const stepX = width / count;
    const barWidth = Math.max(4, Math.min(18, stepX * 0.65));

    for (let i = 0; i < count; i++) {
      const x = i * stepX + (stepX - barWidth) / 2;
      const h = ((data[i] || 0) / max) * (usableH * 0.88);
      const y = usableH - h;

      const grad = ctx.createLinearGradient(0, y, 0, usableH);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#06b6d4');

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, h, [3, 3, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, h);
      }
      ctx.fill();
    }

    // Baseline axis
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, usableH);
    ctx.lineTo(width, usableH);
    ctx.stroke();

    // Small label at bottom
    ctx.fillStyle = theme.textMuted;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('14 Days Ago', 4, height - 4);
    ctx.textAlign = 'right';
    ctx.fillText('Today', width - 4, height - 4);
  },

  // Draw Revenue & Profit Stacked Breakdown Chart
  drawProfitBreakdown(canvasId, { rental, insurance, addOns, other }) {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;
    const theme = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    const categories = [
      { name: 'Rental', val: rental || 400000, color: '#3b82f6' },
      { name: 'Insurance', val: insurance || 80000, color: '#8b5cf6' },
      { name: 'Add-ons', val: addOns || 55000, color: '#06b6d4' },
      { name: 'Other', val: other || 30000, color: '#f59e0b' }
    ];

    const max = Math.max(...categories.map(c => c.val), 100000);
    const count = categories.length;
    const paddingBottom = 24;
    const usableH = height - paddingBottom;
    const stepX = width / count;
    const barWidth = Math.max(14, Math.min(36, stepX * 0.52));

    for (let i = 0; i < count; i++) {
      const cat = categories[i];
      const x = i * stepX + (stepX - barWidth) / 2;
      const h = ((cat.val || 0) / max) * (usableH * 0.85);
      const y = usableH - h;

      ctx.fillStyle = cat.color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, h, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, h);
      }
      ctx.fill();

      // Label below bar
      ctx.fillStyle = theme.textMuted;
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cat.name, x + barWidth / 2, height - 6);
    }
  },

  // Draw Category Performance Bar Chart (Sedan, SUV, Luxury, Sports, Electric)
  drawCategoryBarChart(canvasId, categories = []) {
    const res = this.setupCanvas(canvasId);
    if (!res) return;
    const { ctx, width, height } = res;
    const theme = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    if (!categories || categories.length === 0) return;

    const maxVal = Math.max(...categories.map(c => c.revenue || 1), 10000);
    const count = categories.length;
    const paddingBottom = 26;
    const paddingTop = 20;
    const usableH = Math.max(10, height - paddingTop - paddingBottom);
    const stepX = width / count;
    const barWidth = Math.max(12, Math.min(42, stepX * 0.5));

    // Baseline axis
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - paddingBottom);
    ctx.lineTo(width, height - paddingBottom);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const cat = categories[i];
      const x = i * stepX + (stepX - barWidth) / 2;
      const barH = Math.max(4, ((cat.revenue || 0) / maxVal) * usableH);
      const y = height - paddingBottom - barH;

      const grad = ctx.createLinearGradient(0, y, 0, height - paddingBottom);
      grad.addColorStop(0, cat.color || '#3b82f6');
      grad.addColorStop(1, (cat.color || '#3b82f6') + '99');

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barH);
      }
      ctx.fill();

      // Top value text
      ctx.fillStyle = theme.textPrimary;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const formattedRev = cat.revenue >= 100000 ? `₹${(cat.revenue / 100000).toFixed(1)}L` : (cat.revenue > 0 ? `₹${(cat.revenue / 1000).toFixed(0)}k` : '₹0');
      ctx.fillText(formattedRev, x + barWidth / 2, y - 6);

      // Label below bar
      ctx.fillStyle = theme.textMuted;
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cat.category, x + barWidth / 2, height - 8);
    }
  }
};

