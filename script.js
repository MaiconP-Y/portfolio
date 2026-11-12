(function() {
    // Preferência de movimento (usada pelo carrossel e pelo canvas)
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Ano do rodapé
    document.getElementById('y').textContent = new Date().getFullYear();

    // 2. Scroll reveal: elementos `.rv` aparecem suavemente ao entrar na tela
    var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            io.unobserve(entry.target);
        });
    }, { threshold: .12 });

    document.querySelectorAll('.rv').forEach(function(el) { io.observe(el); });

    // 3. Carrossel de serviços (desliza + fade)
    (function() {
        var slides = document.querySelectorAll('.slide');
        if (!slides.length) return;

        var dotsBox = document.getElementById('srvDots'),
            counter = document.getElementById('srvN'),
            root = document.getElementById('servicos'),
            dur = reduced ? 0 : 450,
            idx = 0, busy = false, dots = [];

        slides.forEach(function(s, i) {
            var d = document.createElement('i');
            if (i === 0) d.className = 'on';
            dotsBox.appendChild(d);
            dots.push(d);
            s.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        });

        // dir: 1 = avança, -1 = volta
        function go(n, dir) {
            n = (n + slides.length) % slides.length;
            if (busy || n === idx) return;
            busy = true;

            var out = slides[idx], inn = slides[n],
                opt = { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)' };

            out.classList.add('leaving');
            out.classList.remove('active');
            inn.classList.add('active');
            out.setAttribute('aria-hidden', 'true');
            inn.setAttribute('aria-hidden', 'false');

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

        // Setas do teclado
        root.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight') go(idx + 1, 1);
            if (e.key === 'ArrowLeft')  go(idx - 1, -1);
        });

        // Swipe no celular
        var x0 = null;
        root.addEventListener('touchstart', function(e) { x0 = e.touches[0].clientX; }, { passive: true });
        root.addEventListener('touchend', function(e) {
            if (x0 === null) return;
            var dx = e.changedTouches[0].clientX - x0;
            if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
            x0 = null;
        });
    })();

    // 4. Partículas 3D em Canvas puro
    (function() {
        var canvas = document.getElementById('bg'),
            ctx = canvas.getContext('2d'),
            styles = getComputedStyle(document.documentElement),
            color1 = styles.getPropertyValue('--p1').trim(),
            color2 = styles.getPropertyValue('--p2').trim(),
            // Celular: versão leve (poucas partículas, 30 FPS, anima só enquanto rola)
            isMobile = matchMedia('(max-width: 700px)').matches,
            total = isMobile ? 40 : 100,
            frozen = reduced, // quem prefere menos movimento recebe fundo estático
            particles = [],
            width, height,
            isRunning = true,
            scrollYPos = 0,
            time = 0,
            rafId = 0,
            lastFrame = 0;

        // Partículas com posição (x, y, z) aleatória no espaço 3D
        for (var i = 0; i < total; i++) {
            particles.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random() * 2 - 1,
                s: Math.random() * 6.28,
                k: i % 2 // alterna cor 1 (verde) e cor 2 (ciano)
            });
        }

        // Ajusta o canvas à tela respeitando a densidade de pixels
        function resizeCanvas() {
            var dpi = Math.min(devicePixelRatio || 1, isMobile ? 1 : 1.5);
            width = innerWidth;
            // Celular: usa sempre a maior altura, assim a barra do navegador não causa resize
            height = isMobile ? Math.max(innerHeight, screen.height) : innerHeight;
            canvas.width = width * dpi;
            canvas.height = height * dpi;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
        }

        addEventListener('resize', function() {
            // Celular: só redesenha se a largura mudar (ex.: girar a tela)
            if (isMobile && innerWidth === width) return;
            resizeCanvas();
            render(); // redimensionar limpa o canvas
        });
        resizeCanvas();

        function render(now) {
            // Celular: limita a ~30 FPS
            if (isMobile && now && now - lastFrame < 33) { start(); return; }
            lastFrame = now || lastFrame;

            scrollYPos += (scrollY - scrollYPos) * .06; // suaviza o scroll
            if (!frozen) time += isMobile ? 2 : 1;      // celular: 2x por frame para manter a velocidade a 30 FPS

            ctx.clearRect(0, 0, width, height);

            // Rotação da câmera: tempo + rolagem
            var angle = time * .0001 + scrollYPos * .0004,
                cos = Math.cos(angle),
                sin = Math.sin(angle);

            // Projeta cada partícula do espaço 3D para o canvas 2D
            for (var i = 0; i < total; i++) {
                var p = particles[i],
                    X = p.x * cos + p.z * sin,
                    Z = -p.x * sin + p.z * cos,
                    Y = p.y + Math.sin(time * .01 + p.s) * .03,
                    perspective = 1 / (1.6 - Z * .6),
                    u = (Z + 1) / 2;

                ctx.fillStyle = 'rgba(' + (p.k ? color1 : color2) + ',' + (.15 + u * .6) + ')';
                ctx.beginPath();
                ctx.arc(width / 2 + X * perspective * width * .55,
                        height * .5 + Y * perspective * height * .5,
                        .7 + u * 3, 0, 6.2832);
                ctx.fill();
            }

            // Celular: pausa o loop quando a rotação já alcançou a rolagem (economiza bateria)
            if (isMobile && !frozen && Math.abs(scrollY - scrollYPos) < .5) return;
            start();
        }

        // Agenda o próximo frame (nunca mais de um loop ao mesmo tempo)
        function start() {
            if (rafId || !isRunning || frozen) return;
            rafId = requestAnimationFrame(function(now) { rafId = 0; render(now); });
        }

        // Pausa quando a aba não está visível
        document.addEventListener('visibilitychange', function() {
            isRunning = !document.hidden;
            if (isRunning) render();
        });

        render();
        if (frozen) addEventListener('scroll', render, { passive: true });
        // Celular: o scroll acorda o loop, que dorme de novo ao parar
        else if (isMobile) addEventListener('scroll', start, { passive: true });
    })();
})();