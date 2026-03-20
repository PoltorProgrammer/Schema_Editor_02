/**
 * Results Chart Plugins Mixin
 * Custom Chart.js plugins and decorators for Results Page
 */
Object.assign(SchemaEditor.prototype, {
    registerCurvedTextPlugin() {
        if (this.curvedTextPluginRegistered) return;

        Chart.register({
            id: 'curvedText',
            afterDatasetsDraw(chart) {
                if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;

                const { ctx, data } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const { x, y, startAngle, endAngle, innerRadius, outerRadius } = element;
                        const label = (dataset.labels && dataset.labels[index]) || data.labels[index];
                        const value = dataset.data[index];

                        const isHidden = (meta.data[index] && meta.data[index].hidden) || !chart.getDataVisibility(index);

                        if (value === 0 || isHidden) return;

                        // Calculate total of ONLY visible segments in this dataset
                        const total = dataset.data.reduce((sum, val, idx) => {
                            const segmentMeta = meta.data[idx];
                            const isVisible = (!segmentMeta || !segmentMeta.hidden) && chart.getDataVisibility(idx);
                            if (isVisible) return sum + val;
                            return sum;
                        }, 0);

                        const percentVal = total > 0 ? (value / total) * 100 : 0;
                        const percentage = percentVal.toFixed(0);

                        const midAngle = (startAngle + endAngle) / 2;
                        const midRadius = (innerRadius + outerRadius) / 2;

                        // Calculate scale factor relative to a standard view (e.g., 400px min dimension)
                        // This ensures that for high-res exports (e.g. 1000px), the text scales up proportionally
                        const minDim = Math.min(chart.width, chart.height);
                        const scale = Math.max(1, minDim / 400);

                        // Dynamic Sizing scaled
                        const percentFactor = Math.min(32, Math.max(11, 10 + (percentVal / 3.5)));
                        const fontSize = percentFactor * scale;

                        // Calculate offsets to center the text block around midRadius
                        // We want a constant visual gap between the label and the stats
                        const gap = 4 * scale;
                        const statsFontSize = 10 * scale;

                        // Line 1 (Label) is shifted 'up' (visually) by half of Line 2's height + half gap
                        const radiusOffsetLabel = (statsFontSize + gap) / 2;

                        // Line 2 (Stats) is shifted 'down' (visually) by half of Line 1's height + half gap
                        const radiusOffsetStats = (fontSize + gap) / 2;

                        const line1 = label;
                        const line2 = `${value} (${percentage}%)`;

                        // Normalize angle to 0-2PI to detect bottom half
                        const normalizedAngle = ((midAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                        const isBottomHalf = normalizedAngle > 0 && normalizedAngle < Math.PI;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';

                        const drawCurvedLine = (text, radius, fontSize, isBold) => {
                            ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Inter, system-ui, sans-serif`;

                            const angleRange = endAngle - startAngle;
                            const arcLength = radius * angleRange;

                            if (arcLength > ctx.measureText(text).width * 0.85) {
                                let chars = text.split('');
                                const totalTextAngle = ctx.measureText(text).width / radius;

                                if (isBottomHalf) {
                                    // Draw CCW (from left to right for the viewer) - Do NOT reverse the string
                                    let currentAngle = midAngle + (totalTextAngle / 2);

                                    chars.forEach((char) => {
                                        const charAngle = ctx.measureText(char).width / radius;
                                        const angle = currentAngle - charAngle / 2;

                                        ctx.save();
                                        ctx.rotate(angle);
                                        ctx.translate(radius, 0);
                                        ctx.rotate(-Math.PI / 2); // Flip character upright (facing center)
                                        ctx.fillText(char, 0, 0);
                                        ctx.restore();

                                        currentAngle -= charAngle;
                                    });
                                } else {
                                    // Standard orientation for top half (CW)
                                    let currentAngle = midAngle - (totalTextAngle / 2);

                                    chars.forEach((char) => {
                                        const charAngle = ctx.measureText(char).width / radius;
                                        const angle = currentAngle + charAngle / 2;

                                        ctx.save();
                                        ctx.rotate(angle);
                                        ctx.translate(radius, 0);
                                        ctx.rotate(Math.PI / 2); // Face outward
                                        ctx.fillText(char, 0, 0);
                                        ctx.restore();

                                        currentAngle += charAngle;
                                    });
                                }
                                return true;
                            }
                            return false;
                        };

                        // Draw Line 1 (Label) - shifted "inwards/up"
                        drawCurvedLine(line1, midRadius - radiusOffsetLabel, fontSize, true);

                        // Draw Line 2 (Stats) - shifted "outwards/down"
                        drawCurvedLine(line2, midRadius + radiusOffsetStats, statsFontSize, false);

                        ctx.restore();
                    });
                });
            }
        });

        this.curvedTextPluginRegistered = true;
    }
});
