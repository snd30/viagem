
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// SUBSTITUA PELA CONFIGURACAO DO SEU PROJETO FIREBASE
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJETO.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const destinosRef = collection(db, "destinos");

const formDestino = document.getElementById("formDestino");
const listaDestinos = document.getElementById("listaDestinos");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoCancelar = document.getElementById("botaoCancelar");
const tituloFormulario = document.getElementById("tituloFormulario");
const totalDestinos = document.getElementById("totalDestinos");

let destinos = [];
let carregamentoInicial = true;

// Evita inserir texto digitado pelo usuário como HTML.
function escaparHTML(valor = "") {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? "#b64040" : "";
}

// CONSULTAR: recebe atualizações do Firestore em tempo real.
onSnapshot(destinosRef, snapshot => {
    destinos = snapshot.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));

    destinos.sort((a, b) => {
        const dataA = a.criadoEm?.toMillis?.() || 0;
        const dataB = b.criadoEm?.toMillis?.() || 0;
        return dataB - dataA;
    });

    totalDestinos.textContent = destinos.length;
    renderizarDestinos();

    if (carregamentoInicial) {
        mostrarMensagem(
            destinos.length
                ? `${destinos.length} destino(s) carregado(s) com sucesso.`
                : "Seu diário está pronto! Adicione seu primeiro destino."
        );
        carregamentoInicial = false;
    }
}, erro => {
    console.error("Erro ao consultar Firestore:", erro);
    mostrarMensagem(
        "Não foi possível acessar o Firestore. Confira a configuração e as regras de segurança.",
        true
    );
});

// MOSTRAR OS DESTINOS NA TELA.
function renderizarDestinos() {
    const pesquisa = document.getElementById("pesquisa").value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filtroNota = Number(document.getElementById("filtroNota").value || 0);

    const filtrados = destinos.filter(destino => {
        const texto = `${destino.cidade || ""} ${destino.pais || ""}`
            .toLocaleLowerCase("pt-BR");

        return texto.includes(pesquisa) &&
            Number(destino.nota || 0) >= filtroNota;
    });

    if (filtrados.length === 0) {
        listaDestinos.innerHTML = `
            <div class="vazio">
                <h3>Nenhum destino encontrado</h3>
                <p>Adicione uma cidade ou altere sua pesquisa para encontrar destinos.</p>
            </div>
        `;
        return;
    }

    listaDestinos.innerHTML = filtrados.map(destino => {
        const nota = Math.min(5, Math.max(1, Number(destino.nota) || 1));
        const estrelas = "★".repeat(nota) + "☆".repeat(5 - nota);

        return `
            <article class="destino-card">
                <div class="destino-capa">
                    <span>✈ Minha viagem</span>
                    <span>${estrelas}</span>
                </div>

                <div class="destino-corpo">
                    <h3>${escaparHTML(destino.cidade)}</h3>
                    <p class="destino-pais">${escaparHTML(destino.pais)}</p>

                    <div class="estrelas" aria-label="Nota ${nota} de 5">
                        ${estrelas}
                    </div>

                    <p class="destino-comentario">${
                        escaparHTML(destino.comentario || "Nenhuma anotação adicionada.")
                    }</p>

                    <button
                        class="botao-editar"
                        type="button"
                        data-acao="clima"
                        data-cidade="${escaparHTML(destino.cidade)}"
                        style="width:100%;margin-top:14px"
                    >
                        ☀ Consultar clima
                    </button>

                    <div class="destino-acoes">
                        <button
                            class="botao-editar"
                            type="button"
                            data-acao="editar"
                            data-id="${escaparHTML(destino.id)}"
                        >
                            Editar
                        </button>

                        <button
                            class="botao-excluir"
                            type="button"
                            data-acao="excluir"
                            data-id="${escaparHTML(destino.id)}"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

// CADASTRAR E ATUALIZAR.
formDestino.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("destinoId").value;
    const cidade = document.getElementById("cidade").value.trim();
    const pais = document.getElementById("pais").value.trim();
    const nota = Number(document.getElementById("nota").value);
    const comentario = document.getElementById("comentario").value.trim();

    if (!cidade || !pais) {
        mostrarMensagem("Preencha a cidade e o país.", true);
        return;
    }

    const dados = {
        cidade,
        pais,
        nota,
        comentario,
        atualizadoEm: serverTimestamp()
    };

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";

    try {
        if (id) {
            // UPDATE: altera um destino existente.
            await updateDoc(doc(db, "destinos", id), dados);
            mostrarMensagem("Destino atualizado com sucesso!");
        } else {
            // CREATE: cadastra um novo destino.
            await addDoc(destinosRef, {
                ...dados,
                criadoEm: serverTimestamp()
            });
            mostrarMensagem("Destino cadastrado com sucesso!");
        }

        formDestino.reset();
        document.getElementById("destinoId").value = "";
        document.getElementById("nota").value = "5";
        tituloFormulario.textContent = "Adicionar destino";
        botaoSalvar.textContent = "Salvar destino →";
        botaoCancelar.hidden = true;

        document.getElementById("destinos").scrollIntoView({
            behavior: "smooth"
        });
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        mostrarMensagem(
            "Não foi possível salvar. Confira sua conexão com o Firebase e as regras do Firestore.",
            true
        );
    } finally {
        botaoSalvar.disabled = false;
        if (!document.getElementById("destinoId").value) {
            botaoSalvar.textContent = "Salvar destino →";
        }
    }
});

// EDITAR, EXCLUIR E CONSULTAR O CLIMA DE UM DESTINO.
listaDestinos.addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;

    const acao = botao.dataset.acao;

    if (acao === "clima") {
        const cidade = botao.dataset.cidade;
        document.getElementById("cidadeClima").value = cidade;
        document.getElementById("clima").scrollIntoView({
            behavior: "smooth"
        });
        consultarClima(cidade);
        return;
    }

    const id = botao.dataset.id;
    const destino = destinos.find(item => item.id === id);

    if (!destino) return;

    if (acao === "editar") {
        document.getElementById("destinoId").value = destino.id;
        document.getElementById("cidade").value = destino.cidade || "";
        document.getElementById("pais").value = destino.pais || "";
        document.getElementById("nota").value = String(destino.nota || 5);
        document.getElementById("comentario").value = destino.comentario || "";

        tituloFormulario.textContent = "Editar destino";
        botaoSalvar.textContent = "Atualizar destino →";
        botaoCancelar.hidden = false;

        document.getElementById("cadastro").scrollIntoView({
            behavior: "smooth"
        });
    }

    if (acao === "excluir") {
        const confirmar = window.confirm(
            `Deseja realmente excluir ${destino.cidade}, ${destino.pais}?`
        );

        if (!confirmar) return;

        botao.disabled = true;

        try {
            // DELETE: remove o documento do Firestore.
            await deleteDoc(doc(db, "destinos", id));
            mostrarMensagem("Destino excluído com sucesso!");
        } catch (erro) {
            console.error("Erro ao excluir:", erro);
            mostrarMensagem("Não foi possível excluir o destino.", true);
            botao.disabled = false;
        }
    }
});

// CANCELAR A EDIÇÃO.
botaoCancelar.addEventListener("click", () => {
    formDestino.reset();
    document.getElementById("destinoId").value = "";
    document.getElementById("nota").value = "5";
    tituloFormulario.textContent = "Adicionar destino";
    botaoSalvar.textContent = "Salvar destino →";
    botaoCancelar.hidden = true;
});

// PESQUISAR E FILTRAR.
document.getElementById("pesquisa").addEventListener("input", renderizarDestinos);
document.getElementById("filtroNota").addEventListener("change", renderizarDestinos);

// API OPEN-METEO: pesquisa a localização da cidade.
async function buscarLocalizacao(cidade) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", cidade);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", "pt");
    url.searchParams.set("format", "json");

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Não foi possível pesquisar a cidade.");
    }

    const dados = await resposta.json();

    if (!dados.results || dados.results.length === 0) {
        throw new Error("Cidade não encontrada. Confira o nome digitado.");
    }

    return dados.results;
}

// API OPEN-METEO: consulta a temperatura e o clima atual.
async function consultarClima(cidade) {
    const resultado = document.getElementById("resultadoClima");
    resultado.innerHTML = "<p>Consultando o clima...</p>";

    try {
        const locais = await buscarLocalizacao(cidade);

        const local = locais.find(item => item.feature_code === "PPLC") || locais[0];

        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", local.latitude);
        url.searchParams.set("longitude", local.longitude);
        url.searchParams.set(
            "current",
            "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m"
        );
        url.searchParams.set("timezone", "auto");

        const resposta = await fetch(url);

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar o clima.");
        }

        const dados = await resposta.json();
        const atual = dados.current;

        const descricoes = {
            0: "Céu limpo",
            1: "Predominantemente limpo",
            2: "Parcialmente nublado",
            3: "Nublado",
            45: "Nevoeiro",
            48: "Nevoeiro com gelo",
            51: "Garoa leve",
            53: "Garoa moderada",
            55: "Garoa intensa",
            61: "Chuva leve",
            63: "Chuva moderada",
            65: "Chuva intensa",
            71: "Neve leve",
            73: "Neve moderada",
            75: "Neve intensa",
            80: "Pancadas de chuva",
            81: "Pancadas moderadas",
            82: "Pancadas fortes",
            95: "Trovoadas",
            96: "Trovoadas com granizo",
            99: "Trovoadas intensas"
        };

        const descricao = descricoes[atual.weather_code] || "Condição meteorológica variável";
        const localNome = `${local.name}, ${local.country || ""}`;

        resultado.innerHTML = `
            <div class="cartao-clima">
                <h3>${escaparHTML(localNome)}</h3>
                <p>${escaparHTML(descricao)}</p>
                <div class="temperatura">${Math.round(atual.temperature_2m)}°C</div>
                <p>Sensação térmica: ${Math.round(atual.apparent_temperature)}°C</p>

                <div class="detalhes-clima">
                    <span>💧 Umidade: ${atual.relative_humidity_2m}%</span>
                    <span>💨 Vento: ${atual.wind_speed_10m} km/h</span>
                </div>

                <p style="margin-top:15px;font-size:11px">
                    Dados atuais fornecidos pela API Open-Meteo.
                </p>
            </div>
        `;
    } catch (erro) {
        console.error("Erro ao consultar clima:", erro);
        resultado.innerHTML = `
            <div class="cartao-clima">
                <p>${escaparHTML(erro.message || "Erro ao consultar o clima.")}</p>
            </div>
        `;
    }
}

// FORMULÁRIO DE PESQUISA DO CLIMA.
document.getElementById("formClima").addEventListener("submit", evento => {
    evento.preventDefault();

    const cidade = document.getElementById("cidadeClima").value.trim();

    if (cidade) {
        consultarClima(cidade);
    }
});
