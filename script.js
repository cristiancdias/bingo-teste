const telaInicial = document.getElementById("tela-inicial")
const telaCartelas = document.getElementById("tela-cartelas")
const telaJogo = document.getElementById("tela-jogo")
const imagemInput = document.getElementById("imagemCentral")
const qtdCartelasInput = document.getElementById("qtdCartelas")
const preview = document.getElementById("preview")
const btnPDF = document.getElementById("btnPDF")
const btnGerarCartelas = document.getElementById("btnGerarCartelas")
const btnProximaPedra = document.getElementById("btnProximaPedra")
const statusImagem = document.getElementById("statusImagem")
const statusPDF = document.getElementById("statusPDF")
const links = document.querySelectorAll(".click-hide")
const btnRestaurar = document.getElementById("restaurar")

const MAX_CARTELAS = 100
const MAX_IMAGEM_BYTES = 2 * 1024 * 1024

let imagemCentralBase64 = null
let imagemCarregando = false

let pedras = []
let sorteadas = []

function mostrarCartelas() {
  telaInicial.classList.add("hidden")
  telaJogo.classList.add("hidden")
  telaCartelas.classList.remove("hidden")
}

function mostrarJogo() {
  telaInicial.classList.add("hidden")
  telaCartelas.classList.add("hidden")
  telaJogo.classList.remove("hidden")
  iniciarJogo()
}

function voltar() {
  telaCartelas.classList.add("hidden")
  telaJogo.classList.add("hidden")
  telaInicial.classList.remove("hidden")
}

function lerArquivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."))

    reader.readAsDataURL(file)
  })
}

/**
 * Converte SVG em PNG para melhorar a compatibilidade com html2canvas/PDF.
 */
function svgFileToPngDataUrl(svgFile, width = 120, height = 120, scale = 2) {
  return new Promise(async (resolve, reject) => {
    try {
      const svgText = await svgFile.text()
      const svgBlob = new Blob([svgText], { type: "image/svg+xml" })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = width * scale
          canvas.height = height * scale

          const ctx = canvas.getContext("2d")

          if (!ctx) {
            throw new Error("Não foi possível criar o canvas.")
          }

          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          URL.revokeObjectURL(url)
          resolve(canvas.toDataURL("image/png"))
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Falha ao carregar o SVG."))
      }

      img.src = url
    } catch (error) {
      reject(error)
    }
  })
}

imagemInput.addEventListener("change", async event => {
  const file = event.target.files[0]

  imagemCentralBase64 = null
  imagemCarregando = false
  statusImagem.textContent = ""

  if (!file) return

  if (
    !file.type.startsWith("image/") &&
    !file.name.toLowerCase().endsWith(".svg")
  ) {
    statusImagem.textContent = "Selecione um arquivo de imagem válido."
    imagemInput.value = ""
    return
  }

  if (file.size > MAX_IMAGEM_BYTES) {
    statusImagem.textContent = "A imagem deve ter no máximo 2 MB."
    imagemInput.value = ""
    return
  }

  imagemCarregando = true
  statusImagem.textContent = "Carregando imagem..."

  try {
    if (
      file.type === "image/svg+xml" ||
      file.name.toLowerCase().endsWith(".svg")
    ) {
      imagemCentralBase64 = await svgFileToPngDataUrl(file, 120, 120, 2)
    } else {
      imagemCentralBase64 = await lerArquivoComoDataURL(file)
    }

    statusImagem.textContent = "Imagem carregada com sucesso."
  } catch (error) {
    console.error(error)
    imagemCentralBase64 = null
    statusImagem.textContent = "Não foi possível carregar a imagem."
  } finally {
    imagemCarregando = false
  }
})

function validarQuantidadeCartelas() {
  const qtd = Number(qtdCartelasInput.value)

  if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_CARTELAS) {
    alert(`Digite uma quantidade inteira entre 1 e ${MAX_CARTELAS}.`)
    qtdCartelasInput.focus()
    return null
  }

  return qtd
}

function gerarCartelas() {
  const qtd = validarQuantidadeCartelas()

  if (qtd === null) return

  if (imagemCarregando) {
    alert("Aguarde a imagem terminar de carregar.")
    return
  }

  preview.innerHTML = ""
  btnPDF.classList.add("hidden")
  statusPDF.textContent = ""

  const cartelasGeradas = new Set()

  for (let i = 0; i < qtd; i++) {
    let cartela
    let assinatura
    let tentativas = 0

    do {
      cartela = criarCartela()
      assinatura = cartela.dataset.assinatura
      tentativas++

      // Proteção contra uma eventual falha na geração aleatória.
      if (tentativas > 1000) {
        throw new Error("Não foi possível gerar cartelas únicas.")
      }
    } while (cartelasGeradas.has(assinatura))

    cartelasGeradas.add(assinatura)
    preview.appendChild(cartela)
  }

  btnPDF.classList.remove("hidden")
}

function criarCartela() {
  const colunas = {
    B: gerarNumeros(1, 15),
    I: gerarNumeros(16, 30),
    N: gerarNumeros(31, 45),
    G: gerarNumeros(46, 60),
    O: gerarNumeros(61, 75)
  }

  const div = document.createElement("div")
  div.classList.add("cartela")

  // A assinatura ignora a imagem central porque ela é a mesma para todas.
  div.dataset.assinatura = [
    ...colunas.B,
    ...colunas.I,
    ...colunas.N.slice(0, 2),
    ...colunas.N.slice(3),
    ...colunas.G,
    ...colunas.O
  ].join("-")

  const tabela = document.createElement("table")
  const header = document.createElement("tr")

  for (const letra of ["B", "I", "N", "G", "O"]) {
    const th = document.createElement("td")
    th.innerText = letra
    header.appendChild(th)
  }

  tabela.appendChild(header)

  for (let i = 0; i < 5; i++) {
    const tr = document.createElement("tr")

    for (const letra of ["B", "I", "N", "G", "O"]) {
      const td = document.createElement("td")

      if (letra === "N" && i === 2) {
        td.classList.add("free")

        if (imagemCentralBase64) {
          const img = document.createElement("img")
          img.src = imagemCentralBase64
          img.alt = "Imagem central"
          td.appendChild(img)
        } else {
          td.innerText = "★"
        }
      } else {
        td.innerText = colunas[letra][i]
      }

      tr.appendChild(td)
    }

    tabela.appendChild(tr)
  }

  div.appendChild(tabela)
  return div
}

function gerarNumeros(min, max) {
  const nums = []

  while (nums.length < 5) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min

    if (!nums.includes(n)) {
      nums.push(n)
    }
  }

  return nums
}

async function gerarPDF() {
  const cartelas = document.querySelectorAll(".cartela")

  if (cartelas.length === 0) {
    alert("Gere pelo menos uma cartela antes de criar o PDF.")
    return
  }

  if (!window.jspdf?.jsPDF || typeof window.html2canvas !== "function") {
    alert(
      "Não foi possível carregar as bibliotecas necessárias para gerar o PDF. Verifique sua conexão com a internet e tente novamente."
    )
    return
  }

  btnPDF.disabled = true
  btnGerarCartelas.disabled = true
  statusPDF.textContent = "Gerando PDF..."

  try {
    const { jsPDF } = window.jspdf
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    })

    let x = 10
    let y = 10
    let count = 0

    for (let i = 0; i < cartelas.length; i++) {
      statusPDF.textContent = `Gerando PDF: ${i + 1} de ${cartelas.length}...`

      const canvas = await html2canvas(cartelas[i], {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL("image/jpeg", 0.9)

      doc.addImage(imgData, "JPEG", x, y, 88, 88)

      x += 100
      count++

      if (count % 2 === 0) {
        x = 10
        y += 100
      }

      if (count % 4 === 0 && i < cartelas.length - 1) {
        doc.addPage()
        x = 10
        y = 10
      }
    }

    doc.save("cartelas.pdf")
    statusPDF.textContent = "PDF gerado com sucesso."
  } catch (error) {
    console.error("Erro ao gerar PDF:", error)
    statusPDF.textContent = "Erro ao gerar o PDF."
    alert("Não foi possível gerar o PDF. Veja o console para mais detalhes.")
  } finally {
    btnPDF.disabled = false
    btnGerarCartelas.disabled = false
  }
}

// ------------------- Jogo -------------------

function iniciarJogo() {
  pedras = Array.from({ length: 75 }, (_, index) => index + 1)
  sorteadas = []

  document.getElementById("pedraAtual").innerText = "--"
  sorteioEmAndamento = false

  const globo = document.getElementById("globo")
  const globoArea = document.querySelector(".globo-area")
  const layout = document.querySelector(".sorteio-layout")

  if (globo) {
    globo.classList.remove("animando")
  }

  if (globoArea) {
    globoArea.classList.remove("oculto")
  }

  if (layout) {
    layout.classList.remove("resultado-final")
  }

  const statusGlobo = document.getElementById("statusGlobo")

  if (statusGlobo) {
    statusGlobo.textContent = "Pronto para sortear"
  }

  const mensagemSorteio = document.getElementById("mensagemSorteio")

  if (mensagemSorteio) {
    mensagemSorteio.textContent = "Sorteio reiniciado."
  }

  btnProximaPedra.textContent = "🎱 Próxima Pedra"
  btnProximaPedra.disabled = false

  gerarTabelaJogo()
}

function gerarTabelaJogo() {
  const container = document.getElementById("tabela-jogo-container")
  container.innerHTML = ""

  const tabela = document.createElement("table")
  const header = document.createElement("tr")

  for (const letra of ["B", "I", "N", "G", "O"]) {
    const th = document.createElement("th")
    th.colSpan = 2
    th.innerText = letra
    th.classList.add("espaco-coluna")
    header.appendChild(th)
  }

  tabela.appendChild(header)

  for (let i = 0; i < 8; i++) {
    const tr = document.createElement("tr")

    for (let col = 0; col < 5; col++) {
      const inicio = col * 15 + 1
      const meio = inicio + 8

      const numeroEsq = i + inicio
      const numeroDir = i + meio

      const tdEsq = document.createElement("td")
      const tdDir = document.createElement("td")

      if (numeroEsq <= inicio + 7) {
        tdEsq.id = `num-${numeroEsq}`
        tdEsq.innerText = numeroEsq
      }

      if (numeroDir <= inicio + 14) {
        tdDir.id = `num-${numeroDir}`
        tdDir.innerText = numeroDir
      }

      tdEsq.classList.add("espaco-coluna")
      tdDir.classList.add("espaco-coluna")

      tr.appendChild(tdEsq)
      tr.appendChild(tdDir)
    }

    tabela.appendChild(tr)
  }

  container.appendChild(tabela)

  // A tabela é reconstruída a partir do estado real do jogo.
  renderizarPedrasSorteadas()
}

function renderizarPedrasSorteadas() {
  for (const numero of sorteadas) {
    const celula = document.getElementById(`num-${numero}`)

    if (celula) {
      celula.classList.add("sorteado")
    }
  }
}

let sorteioEmAndamento = false
let contextoAudio = null

function criarBolasGlobo() {
  const recipiente = document.getElementById("globoBolas")
  if (!recipiente || recipiente.children.length) return
  const numeros = [7, 12, 18, 23, 31, 36, 42, 48, 54, 61, 66, 72]
  numeros.forEach((numero, i) => {
    const bola = document.createElement("span")
    bola.className = "bola-globo"
    bola.textContent = numero
    const angulo = (Math.PI * 2 * i) / numeros.length
    bola.style.setProperty(
      "--x",
      `${50 + Math.cos(angulo) * (35 + (i % 3) * 3)}%`
    )
    bola.style.setProperty(
      "--y",
      `${50 + Math.sin(angulo) * (34 + (i % 4) * 3)}%`
    )
    recipiente.appendChild(bola)
  })
}

function tocarEfeito(tipo) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!contextoAudio) contextoAudio = new AudioCtx()
    if (contextoAudio.state === "suspended") contextoAudio.resume()
    const agora = contextoAudio.currentTime
    const nota = (
      frequencia,
      atraso,
      duracao,
      volume = 0.035,
      forma = "triangle"
    ) => {
      const oscilador = contextoAudio.createOscillator()
      const ganho = contextoAudio.createGain()
      oscilador.type = forma
      oscilador.frequency.setValueAtTime(frequencia, agora + atraso)
      ganho.gain.setValueAtTime(0.0001, agora + atraso)
      ganho.gain.exponentialRampToValueAtTime(volume, agora + atraso + 0.02)
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + duracao)
      oscilador.connect(ganho)
      ganho.connect(contextoAudio.destination)
      oscilador.start(agora + atraso)
      oscilador.stop(agora + atraso + duracao + 0.03)
    }
    if (tipo === "giro") {
      for (let i = 0; i < 9; i++) nota(180 + i * 32, i * 0.16, 0.17, 0.025)
      nota(560, 1.55, 0.25, 0.04, "sine")
    } else {
      nota(660, 0, 0.13, 0.05, "sine")
      nota(880, 0.13, 0.23, 0.05, "sine")
    }
  } catch (erro) {
    /* áudio é opcional; o sorteio segue normalmente */
  }
}

function sortearPedra() {
  if (sorteioEmAndamento) return

  if (pedras.length === 0) {
    btnProximaPedra.disabled = true
    alert("Todas as pedras já foram sorteadas!")
    return
  }

  sorteioEmAndamento = true
  btnProximaPedra.disabled = true
  btnProximaPedra.textContent = "🎱 Sorteando..."

  const globo = document.getElementById("globo")
  const globoArea = document.querySelector(".globo-area")
  const layout = document.querySelector(".sorteio-layout")
  const status = document.getElementById("statusGlobo")
  const mensagem = document.getElementById("mensagemSorteio")

  // Mostra novamente o globo ao iniciar o próximo sorteio.
  if (globoArea) {
    globoArea.classList.remove("oculto")
  }

  if (layout) {
    layout.classList.remove("resultado-final")
  }

  // Inicia a animação do globo.
  if (globo) {
    globo.classList.remove("animando")
    void globo.offsetWidth
    globo.classList.add("animando")
  }

  if (status) {
    status.textContent = "Misturando as pedras..."
  }

  if (mensagem) {
    mensagem.textContent = "Atenção... a próxima pedra está chegando!"
  }

  tocarEfeito("giro")

  // Escolhe uma pedra aleatória sem repetir números.
  const idx = Math.floor(Math.random() * pedras.length)
  const numero = pedras.splice(idx, 1)[0]

  // Aguarda 2 segundos para revelar a pedra.
  window.setTimeout(() => {
    sorteadas.push(numero)

    const pedraAtual = document.getElementById("pedraAtual")

    if (pedraAtual) {
      pedraAtual.innerText = `${getLetra(numero)} - ${numero}`
      pedraAtual.classList.remove("pedra-revelada")

      void pedraAtual.offsetWidth

      pedraAtual.classList.add("pedra-revelada")
    }

    // Atualiza a tabela com os números sorteados.
    renderizarPedrasSorteadas()

    // Para a animação.
    if (globo) {
      globo.classList.remove("animando")
    }

    // Esconde o globo e destaca a pedra sorteada.
    if (globoArea) {
      globoArea.classList.add("oculto")
    }

    if (layout) {
      layout.classList.add("resultado-final")
    }

    if (status) {
      status.textContent = "Pronto para a próxima pedra"
    }

    if (mensagem) {
      mensagem.textContent = `Saiu ${getLetra(numero)}-${numero}!`
    }

    tocarEfeito("revelar")

    sorteioEmAndamento = false

    // Verifica se todas as pedras foram sorteadas.
    if (pedras.length === 0) {
      btnProximaPedra.disabled = true
      btnProximaPedra.textContent = "Sorteio concluído"
    } else {
      btnProximaPedra.disabled = false
      btnProximaPedra.textContent = "🎱 Próxima Pedra"
    }
  }, 2000)
}

function alternarModoProjecao() {
  document.body.classList.toggle("modo-projecao")
  const botao = document.getElementById("btnModoProjecao")
  if (botao)
    botao.textContent = document.body.classList.contains("modo-projecao")
      ? "🖥️ Modo Normal"
      : "📺 Modo Data Show"
}

function getLetra(num) {
  if (num <= 15) return "B"
  if (num <= 30) return "I"
  if (num <= 45) return "N"
  if (num <= 60) return "G"
  return "O"
}

// Esconder imagens dos padrões de vitória.
links.forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault()

    const img = link.querySelector("img")

    if (img) {
      img.classList.add("hidden")
    }
  })
})

// Restaurar imagens.
btnRestaurar.addEventListener("click", () => {
  const imagens = document.querySelectorAll(".click-hide img")

  imagens.forEach(img => img.classList.remove("hidden"))
})

document.addEventListener("DOMContentLoaded", criarBolasGlobo)
