// 1. Atualiza o ano no rodapé automaticamente
document.getElementById('y').textContent = new Date().getFullYear();

// 2. Animação de scroll (IntersectionObserver)
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

// 2.1 Carrossel de serviços (animação simples: desliza + fade)
(function() {
    var slides = document.querySelectorAll('.slide');
    if (!slides.length) return;

    var dotsBox = document.getElementById('srvDots'),
        counter = document.getElementById('srvN'),
        root = document.getElementById('servicos'),
        idx = 0, busy = false, dots = [],
        reduce = matchMedia('(prefers-reduced-motion: reduce)').matches,
        dur = reduce ? 0 : 450;

    slides.forEach(function(s, i) {
        var d = document.createElement('i');
        if (i === 0) d.className = 'on';
        dotsBox.appendChild(d);
        dots.push(d);
        s.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });

    function go(n, dir) {
        n = (n + slides.length) % slides.length;
        if (busy || n === idx) return;
        busy = true;
        dir = dir || (n > idx ? 1 : -1);

        var out = slides[idx], inn = slides[n];
        out.classList.add('leaving');
        out.classList.remove('active');
        inn.classList.add('active');
        out.setAttribute('aria-hidden', 'true');
        inn.setAttribute('aria-hidden', 'false');

        var opt = { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)' };
        out.animate([{ opacity: 1, transform: 'none' },
                     { opacity: 0, transform: 'translateX(' + (-dir * 40) + 'px) scale(.98)' }], opt);
        inn.animate([{ opacity: 0, transform: 'translateX(' + (dir * 40) + 'px) scale(.98)' },
                     { opacity: 1, transform: 'none' }], opt)
           .onfinish = function() { out.classList.remove('leaving'); busy = false; };
        if (!dur) { out.classList.remove('leaving'); busy = false; }

        dots[idx].classList.remove('on');
        dots[n].classList.add('on');
        counter.textContent = ('0' + (n + 1)).slice(-2);
        idx = n;
    }

    document.getElementById('srvNext').addEventListener('click', function() { go(idx + 1, 1); });
    document.getElementById('srvPrev').addEventListener('click', function() { go(idx - 1, -1); });

    // Teclado (setas) quando o carrossel tem foco
    root.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight') go(idx + 1, 1);
        if (e.key === 'ArrowLeft')  go(idx - 1, -1);
    });

    // Arrastar no celular (swipe)
    var x0 = null;
    root.addEventListener('touchstart', function(e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function(e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) go(dx < 0 ? idx + 1 : idx - 1, dx < 0 ? 1 : -1);
        x0 = null;
    });

    // Gatilho das demos: abre data-demo-url; sem link, exibe aviso e dispara o evento "demo"
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    var tt;

    document.querySelectorAll('.demo').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var url = btn.dataset.demoUrl, id = btn.dataset.demo;
            // Ponto de extensão: o evento "demo" permite abrir um modal/iframe de demo
            document.dispatchEvent(new CustomEvent('demo', { detail: { id: id, url: url } }));
            if (url) { window.open(url, '_blank', 'noopener'); return; }
            toast.textContent = 'Demo em breve: ' + id;
            toast.classList.add('show');
            clearTimeout(tt);
            tt = setTimeout(function() { toast.classList.remove('show'); }, 2200);
        });
    });
})();

// 3. Efeito de partículas 3D em Canvas puro (sem bibliotecas)
(function() {
    var canvas = document.getElementById('bg'),
        ctx = canvas.getContext('2d'),
        width, height,
        // Celular: versão leve (poucas partículas, 30 FPS, anima só enquanto rola)
        isMobile = matchMedia('(max-width: 700px)').matches,
        totalParticles = isMobile ? 40 : 100,
        particles = [],
        isRunning = true,
        scrollYPos = 0,
        time = 0,
        rafId = 0,
        lastFrame = 0;

    // Verifica se o usuário prefere menos movimento
    var reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches,
        computedStyles = getComputedStyle(document.documentElement),
        color1, color2;

    // Fundo estático apenas para quem prefere menos movimento
    var frozen = reducedMotion;

    // Obtém as cores RGB das variáveis CSS
    function getColors() {
        color1 = computedStyles.getPropertyValue('--p1').trim();
        color2 = computedStyles.getPropertyValue('--p2').trim();
    }
    getColors();

    // Inicializa as partículas com posições (x, y, z) aleatórias no espaço 3D
    for (var i = 0; i < totalParticles; i++) {
        particles.push({
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: Math.random() * 2 - 1,
            s: Math.random() * 6.28,
            k: i % 2 // Alterna entre a cor 1 (verde) e cor 2 (ciano)
        });
    }

    // Ajusta o tamanho do canvas à tela mantendo a proporção de pixels (Retina/High DPI)
    function resizeCanvas() {
        var dpi = Math.min(devicePixelRatio || 1, isMobile ? 1 : 1.5);
        width = innerWidth;
        // Celular: usa sempre a maior altura possível, assim a barra do navegador
        // aparecendo/sumindo não muda o tamanho do canvas nem causa redimensionamento
        height = isMobile ? Math.max(innerHeight, screen.height) : innerHeight;
        canvas.width = width * dpi;
        canvas.height = height * dpi;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    }
    addEventListener('resize', function() {
        // No celular, a barra do navegador muda a altura ao rolar: só redesenha se a largura mudar (ex.: girar a tela)
        if (isMobile && innerWidth === width) return;
        resizeCanvas();
        render(); // Redimensionar limpa o canvas, então redesenha na hora
    });
    resizeCanvas();

    // Loop de animação das partículas (render loop)
    function render(now) {
        // Celular: limita a ~30 FPS (pula frames intermediários)
        if (isMobile && now && now - lastFrame < 33) { start(); return; }
        lastFrame = now || lastFrame;

        scrollYPos += (scrollY - scrollYPos) * .06; // Suavização baseada no scroll da página
        if (!frozen) time += isMobile ? 2 : 1; // No celular avança 2x por frame para manter a mesma velocidade a 30 FPS

        ctx.clearRect(0, 0, width, height); // Limpa a tela a cada frame

        // Rotação da câmera 3D baseada no tempo e na rolagem
        var angle = time * .0001 + scrollYPos * .0004,
            cos = Math.cos(angle),
            sin = Math.sin(angle);

        // Desenha cada partícula projetando do espaço 3D para o canvas 2D
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
            ctx.arc(screenX, screenY, .7 + u * 3.0, 0, 6.2832);
            ctx.fill();
        }

        // Celular: quando a rotação já alcançou a rolagem, pausa o loop até o próximo scroll (economiza bateria)
        if (isMobile && !frozen && Math.abs(scrollY - scrollYPos) < .5) return;
        start();
    }

    // Agenda o próximo frame (garante que nunca exista mais de um loop rodando)
    function loop(now) {
        rafId = 0;
        render(now);
    }

    function start() {
        if (!rafId && isRunning && !frozen) rafId = requestAnimationFrame(loop);
    }

    // Pausa a animação quando a aba não está visível para economizar CPU/bateria
    document.addEventListener('visibilitychange', function() {
        isRunning = !document.hidden;
        if (isRunning) render();
    });

    render();
    if (reducedMotion) addEventListener('scroll', render, { passive: true });
    // Celular: o scroll acorda o loop, que gira o fundo e dorme de novo ao parar
    if (isMobile && !reducedMotion) addEventListener('scroll', start, { passive: true });
})();