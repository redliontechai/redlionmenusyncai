// Generador de Jingle / Campana Sonora (Web Audio API) sin archivos externos pesados
// Funciona 100% Offline para llamar la atención del cliente en Ofertas Relámpago y Spots de Video

export function playPromoAttentionChime(volumePercent: number = 80): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    const normalizedVol = Math.max(0.05, Math.min(1, volumePercent / 100)) * 0.45;
    masterGain.gain.setValueAtTime(normalizedVol, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Acorde ascendente estilo aeropuerto / restaurante moderno (Do5 - Mi5 - Sol5 - Do6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.13);

      noteGain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.13);
      noteGain.gain.exponentialRampToValueAtTime(
        1.0,
        ctx.currentTime + idx * 0.13 + 0.03
      );
      noteGain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + idx * 0.13 + 0.65
      );

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(ctx.currentTime + idx * 0.13);
      osc.stop(ctx.currentTime + idx * 0.13 + 0.7);
    });
  } catch {
    // Ignore if browser blocked audio before user gesture
  }
}

export function playChefRecommendationChime(volumePercent: number = 70): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    const normalizedVol = Math.max(0.04, Math.min(1, volumePercent / 100)) * 0.28;
    masterGain.gain.setValueAtTime(normalizedVol, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Campanita gourmet suave de 2 notas (Sol5 -> Re6) cuando rota la Recomendación del Chef
    const notes = [783.99, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);

      noteGain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
      noteGain.gain.exponentialRampToValueAtTime(
        1.0,
        ctx.currentTime + idx * 0.14 + 0.025
      );
      noteGain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + idx * 0.14 + 0.5
      );

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.55);
    });
  } catch {
    // Ignore if browser blocked audio before user gesture
  }
}


