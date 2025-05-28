// script.js

// Importa jsPDF se você estiver usando módulos, mas para CDN, 'window.jspdf.jsPDF' é mais comum.
// const { jsPDF } = window.jspdf; // Descomente se for usar módulos e a CDN for carregada de forma compatível

document.addEventListener('DOMContentLoaded', () => {
    const cardapioItensDiv = document.getElementById('cardapio-itens-modern');
    const confirmarEscolhaBtn = document.getElementById('confirmar-escolha-modern');
    const confirmacaoModal = document.getElementById('confirmacao-modal');
    const codigoGeradoSpan = document.getElementById('codigo-gerado');
    const closeModalBtn = document.querySelector('.close-modal');
    const gerarRelatorioPdfBtn = document.getElementById('gerar-relatorio-pdf-modern'); // Renomeado o ID
    const relatorioAdminSection = document.getElementById('relatorio-admin');
    const relatorioContagemDiv = document.getElementById('relatorio-contagem-modern');

    // Simulação de dados do cardápio do dia
    const cardapioDoDia = [
        { id: 'arroz', nome: 'Arroz', icone: 'icon_arroz.png' },
        { id: 'feijao', nome: 'Feijão', icone: 'icon_feijao.png' },
        { id: 'repolho', nome: 'Repolho Refogado', icone: 'icon_repolho.png' },
        { id: 'atum', nome: 'Atum', icone: 'icon_atum.png' }
    ];

    let itensSelecionados = new Set(); // Usaremos um Set para garantir itens únicos

    // Inicializa a contagem de merenda, tentando carregar do localStorage
    let contagemMerenda = {};

    // --- Funções de Local Storage ---
    function saveDataToLocalStorage() {
        try {
            localStorage.setItem('bauMerendaContagem', JSON.stringify(contagemMerenda));
            console.log('Dados salvos no localStorage.');
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
            alert('Não foi possível salvar os dados localmente. Por favor, verifique as configurações do navegador.');
        }
    }

    function loadDataFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('bauMerendaContagem');
            if (savedData) {
                contagemMerenda = JSON.parse(savedData);
                console.log('Dados carregados do localStorage.');
            } else {
                // Inicializa a contagem com zeros se não houver dados salvos
                cardapioDoDia.forEach(item => {
                    contagemMerenda[item.id] = 0;
                });
            }
        } catch (e) {
            console.error('Erro ao carregar do localStorage:', e);
            // Se houver erro (dados corrompidos, etc.), reinicializa
            cardapioDoDia.forEach(item => {
                contagemMerenda[item.id] = 0;
            });
        }
    }

    // --- Funções da Interface do Usuário ---
    function carregarCardapio() {
        cardapioItensDiv.innerHTML = '';
        cardapioDoDia.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('item-merenda-card');
            card.dataset.id = item.id;
            card.innerHTML = `
                <img src="${item.icone}" alt="${item.nome}">
                <p>${item.nome}</p>
            `;
            card.addEventListener('click', () => toggleSelecaoMerenda(card, item.id));
            cardapioItensDiv.appendChild(card);
        });
    }

    function toggleSelecaoMerenda(card, itemId) {
        if (itensSelecionados.has(itemId)) {
            itensSelecionados.delete(itemId);
            card.classList.remove('selected');
        } else {
            itensSelecionados.add(itemId);
            card.classList.add('selected');
        }
    }

    function gerarCodigo() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // --- Eventos ---
    confirmarEscolhaBtn.addEventListener('click', () => {
        if (itensSelecionados.size > 0) {
            // Atualiza a contagem para cada item selecionado
            itensSelecionados.forEach(item => {
                contagemMerenda[item]++;
            });

            // Salva os dados no localStorage
            saveDataToLocalStorage();

            const codigo = gerarCodigo();
            codigoGeradoSpan.textContent = codigo;
            confirmacaoModal.style.display = 'flex'; // Mostra o modal

            // Limpa a seleção e os cards
            itensSelecionados.clear();
            const cards = document.querySelectorAll('.item-merenda-card');
            cards.forEach(c => c.classList.remove('selected'));
            atualizarRelatorioParcial(); // Atualiza o relatório da cozinha
        } else {
            alert('Por favor, selecione ao menos um item da merenda.');
        }
    });

    closeModalBtn.addEventListener('click', () => {
        confirmacaoModal.style.display = 'none';
    });

    // --- Funções de Relatório ---
    function atualizarRelatorioParcial() {
        relatorioContagemDiv.innerHTML = ''; // Limpa antes de reconstruir
        let totalAlunos = 0;

        cardapioDoDia.forEach(item => {
            const count = contagemMerenda[item.id] || 0; // Garante que a contagem seja 0 se não existir
            const p = document.createElement('p');
            p.innerHTML = `${item.nome}: <span id="contagem-${item.id}">${count}</span>`;
            relatorioContagemDiv.appendChild(p);
            totalAlunos += count; // Cada escolha de item é uma porção
        });

        // Adiciona a contagem total de "alunos" (requisições de prato)
        const pTotal = document.createElement('p');
        pTotal.innerHTML = `<strong>Total de Pratos Solicitados: <span id="total-alunos">${totalAlunos}</span></strong>`;
        relatorioContagemDiv.appendChild(pTotal);
    }

    // Função para gerar o relatório em PDF
    gerarRelatorioPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf; // Acessa jsPDF do objeto global window
        const doc = new jsPDF();

        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        doc.setFontSize(22);
        doc.text("Relatório de Demanda de Merenda", 10, 20);
        doc.setFontSize(12);
        doc.text(`Data: ${dataAtual} - Hora: ${horaAtual}`, 10, 30);
        doc.text("Baú da Merenda Digital", 10, 40);

        let y = 60;
        let totalAlunosComendo = 0; // Para contar quantas pessoas fizeram escolhas

        doc.setFontSize(14);
        doc.text("Detalhes das Solicitações:", 10, y);
        y += 10;

        // Itera sobre os itens do cardápio para garantir que todos apareçam no relatório
        cardapioDoDia.forEach(item => {
            const count = contagemMerenda[item.id] || 0;
            doc.text(`${item.nome}: ${count} porções`, 20, y);
            y += 10;
            if (count > 0) { // Considera que se escolheu um item, vai comer
                 // Para uma contagem mais precisa de "pessoas", seria ideal ter um ID único por aluno.
                 // Como estamos gerando um código por escolha, vamos contar o número de porções como "total de pratos".
                 // Ou podemos manter um array de códigos gerados e contar a length dele.
                 // Por enquanto, vamos somar as porções como "total de pratos".
                 totalAlunosComendo += count; // Adapte essa lógica se tiver um sistema de matrícula
            }
        });

        // Para obter o total de *pessoas* que fizeram uma escolha (que é o que você quer "quantas pessoas vão comer")
        // No nosso modelo atual, cada "confirmação" gera um código único e incrementa a contagem de ITENS.
        // Se você quer saber quantas PESSOAS, precisaríamos de uma forma de saber quantos códigos ÚNICOS foram gerados.
        // Vamos simular que cada "confirmação" representa 1 pessoa para o total de pessoas, mesmo que ela escolha múltiplos itens.
        // Isso exigiria armazenar os códigos gerados e a contagem deles.

        // Por simplicidade, vamos usar o número de vezes que o botão de confirmar foi clicado (assumindo 1 clique = 1 pessoa)
        // Isso não é diretamente do `contagemMerenda`, então teríamos que ter outra variável para isso.
        // Para o seu caso, a soma dos itens solicitados geralmente é a métrica mais relevante para a cozinha.
        // Se realmente precisar de "quantas pessoas", precisaria de um array de códigos gerados.

        // Para este protótipo, vamos indicar o "Total de Porções Solicitadas"
        const totalPorcoes = Object.values(contagemMerenda).reduce((sum, current) => sum + current, 0);

        y += 10;
        doc.setFontSize(16);
        doc.text(`Total de Porções Solicitadas: ${totalPorcoes}`, 10, y);
        y += 10;
        doc.text(`Número de Confirmações (Estudantes Únicos Estimados): ${window.numConfirmacoes || 0}`, 10, y); // Adiciona essa linha e cria a variável no JS

        // Rodapé
        doc.setFontSize(10);
        doc.text("Gerado por Baú da Merenda Digital", 10, doc.internal.pageSize.height - 10);

        doc.save(`relatorio_merenda_${dataAtual}.pdf`);
    });

    // --- Inicialização ---
    loadDataFromLocalStorage(); // Carrega os dados salvos
    carregarCardapio();
    atualizarRelatorioParcial();

    // Simulação de acesso administrativo (para exibir o relatório)
    const isAdmin = confirm("Você é da equipe da cozinha? Clique OK para ter acesso ao relatório administrativo.");
    if (isAdmin) {
        relatorioAdminSection.style.display = 'block';
    }

    // Variável para contar o número de confirmações (para a métrica de "pessoas")
    window.numConfirmacoes = parseInt(localStorage.getItem('bauMerendaNumConfirmacoes') || '0');
    // Atualiza a contagem no local storage quando uma confirmação é feita
    confirmarEscolhaBtn.addEventListener('click', () => {
        if (itensSelecionados.size > 0) {
            // ... (código existente para contagem de itens e geração de código)
            window.numConfirmacoes++;
            localStorage.setItem('bauMerendaNumConfirmacoes', window.numConfirmacoes);
            // ... (continua com o código de exibição do modal, etc.)
        }
    }, true); // Use true para garantir que este event listener seja chamado antes dos outros, se houver.
});