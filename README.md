# Trilha Fúria 2

Jogo de motocross 3D de corrida 1 contra 1, feito para rodar no navegador com [three.js](https://threejs.org/).
Visão lateral, física de moto própria em unidades reais, 5 pistas, medalhas, garagem de melhorias e mortais.

## Como jogar

| Tecla | Ação |
|---|---|
| `W` / `→` | Acelera |
| `S` / `←` | Freia |
| `A` / `↑` | Joga o corpo para trás |
| `D` / `↓` | Joga o corpo para frente |
| `R` | Reinicia a corrida |
| `Esc` | Volta ao menu |

No celular aparecem botões na tela.

- Vença o rival para liberar a próxima pista.
- Medalhas: bronze por terminar, prata por chegar antes do rival, ouro abaixo do tempo-alvo.
- Moedas compram melhorias de motor, suspensão e pneus na garagem.
- Cada salto tem uma faixa de velocidade certa (em torno de 45 a 60 km/h). Muito rápido passa da rampa de pouso; muito devagar cai antes dela.
- No ar, acelerar levanta a frente e frear abaixa (reação da roda traseira).

### Modos de física

- **Realista**: pesos, medidas e gravidade reais. No ar, jogar o corpo gira a moto devagar; mortal é possível com salto grande.
- **Simulação**: no ar só o giro da roda traseira mexe a moto. Mortal fica quase impossível.

### Gráficos

- **Alto**: brilho (bloom), antisserrilhado, granulação e sombras em alta resolução.
- **Leve**: sem pós-processamento, para celular e computador mais fraco.

## Rodar no computador

O jogo carrega os céus HDR da pasta `assets/`, então precisa ser aberto por um servidor local (abrir o `index.html` direto com dois cliques não carrega os céus).

```bash
# na pasta do projeto, com Node instalado
npx serve .
# ou com Python
python -m http.server 8000
```

Depois abra o endereço que aparecer (por exemplo `http://localhost:8000`).

## Estrutura

```
index.html          jogo pronto (gerado pelo build)
src/game.html       página do jogo: cenário, moto, piloto, efeitos, menus
src/physics.js      física da moto, geração das pistas e rival
assets/             céus HDR em PNG (formato RGBE sem perda)
tools/build.py      junta src/game.html + src/physics.js em index.html
tests/bot-test.js   piloto automático que testa as 5 pistas sem navegador
```

Depois de editar algo em `src/`, gere o `index.html` de novo:

```bash
python tools/build.py
```

Para testar a física com o piloto automático:

```bash
node tests/bot-test.js real 0   # modo realista, sem melhorias
node tests/bot-test.js sim 4    # modo simulação, melhorias no máximo
```

## Publicar no GitHub Pages

No repositório do GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. Em alguns minutos o jogo fica disponível em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.

## Créditos

- Motor gráfico: [three.js](https://threejs.org/) (licença MIT), carregado pelo CDN jsDelivr.
- Céus HDR: [Poly Haven](https://polyhaven.com/hdris) (CC0, domínio público): *Quarry 01*, *Spruit Sunrise*, *Blouberg Sunrise 2* e *Moonless Golf*, convertidos para PNG RGBE.
- Fontes: Teko e Rubik (Google Fonts, licença OFL).
