// 1. Atualiza o ano no rodapé automaticamente
document.getElementById('y').textContent = new Date().getFullYear();

// 2. Animação de Scroll (IntersectionObserver)
// Faz os elementos com a classe `.rv` aparecerem suavemente conforme entram na tela
var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('in'); // Adiciona a classe que ativa a opacidade/transformação
            io.unobserve(entry.target);        // Para de observar o elemento já animado
        }
    });
}, { threshold: .12 }); // Dispara quando 12% do elemento entra no campo de visão

document.querySelectorAll('.rv').forEach(function(el) {
    io.observe(el);
});

// 3. Efeito de Partículas 3D em Canvas Puro (Zero Bibliotecas)
(function() {
    var canvas = document.getElementById('bg'),
        ctx = canvas.getContext('2d'),
        width, height,
        totalParticles = 100,
        particles = [],
        isRunning = true,
        scrollYPos = 0,
        time = 0;

    // Checa se o usuário prefere menos movimento
    var reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches,
        computedStyles = getComputedStyle(document.documentElement),
        color1, color2;

    // Obtém as cores RGB das variáveis CSS
    function getColors() {
        color1 = computedStyles.getPropertyValue('--p1').trim();
        color2 = computedStyles.getPropertyValue('--p2').trim();
    }
    getColors();

    // Atualiza cores caso a preferência de tema claro/escuro mude
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
        setTimeout(getColors, 50);
    });

    // Inicializa 40 partículas com posições (x, y, z) aleatórias no espaço 3D
    for (var i = 0; i < totalParticles; i++) {
        particles.push({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random() * 2 - 1,
            s: Math.random() * 6.28,
            k: i % 2 // Alterna entre a cor 1 (verde) e cor 2 (ciano)
        });
    }

    // Ajusta o tamanho do Canvas dinamicamente na tela mantendo a proporção de pixels (Retina/High DPI)
    function resizeCanvas() {
        var dpi = Math.min(devicePixelRatio || 1, 1.5);
        width = innerWidth;
        height = innerHeight;
        canvas.width = width * dpi;
        canvas.height = height * dpi;
        ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    }
    addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Loop de Animação das Partículas (Render Loop)
    function render() {
        scrollYPos += (scrollY - scrollYPos) * .06; // Suavização baseada no scroll da página
        if (!reducedMotion) time += 1;

        ctx.clearRect(0, 0, width, height); // Limpa a tela a cada frame

        // Rotação da câmera 3D baseada no tempo e na rolagem
        var angle = time * .0001 + scrollYPos * .0002,
            cos = Math.cos(angle),
            sin = Math.sin(angle);

        // Desenha cada partícula projetando do espaço 3D para o Canvas 2D
        for (var i = 0; i < totalParticles; i++) {
            var p = particles[i],
                X = p.x * cos + p.z * sin,
                Z = -p.x * sin + p.z * cos,
                Y = p.y + Math.sin(time * .01 + p.s) * .03,
                perspective = 1 / (1.6 - Z * .6),
                u = (Z + 1) / 2,
                screenX = width / 2 + X * perspective * width * .55,
                screenY = height * .5 + Y * perspective * height * .5;

            ctx.fillStyle = 'rgba(' + (p.k ? color1 : color2) + ',' + (.15 + u * .6) + ')';
            ctx.beginPath();
            ctx.arc(screenX, screenY, .7 + u * 1.8, 0, 6.2832);
            ctx.fill();
        }

        if (isRunning && !reducedMotion) requestAnimationFrame(render);
    }

    // Otimização: Pausa a animação quando a aba não está visível para economizar CPU/Bateria
    document.addEventListener('visibilitychange', function() {
        isRunning = !document.hidden;
        if (isRunning) render();
    });

    render();
    if (reducedMotion) addEventListener('scroll', render, { passive: true });
})();
