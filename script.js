/**
 * ==========================================================================
 * Lista da Casa - Lógica em JavaScript Puro (Vanilla JS)
 * Versão Otimizada e Testada:
 * - Delegação de eventos de alta performance
 * - Fallback universal de cópia para WhatsApp (compatível com file:// e http)
 * - Fechamento de modal por clique externo (backdrop) e tecla ESC
 * - Busca em tempo real, Edição, Desfazer (Undo) e Ordenação Inteligente
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------------------
  // 1. Chave de Armazenamento e Estado
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'lista_compras_domestica_v1';

  // Exemplos iniciais amigáveis caso seja o primeiro acesso
  const defaultItems = [
    {
      id: Date.now() - 3000,
      name: "Leite Integral",
      quantity: "2 caixas",
      category: "Alimentação",
      bought: false
    },
    {
      id: Date.now() - 2000,
      name: "Detergente Neutro",
      quantity: "1 frasco",
      category: "Limpeza",
      bought: false
    },
    {
      id: Date.now() - 1000,
      name: "Sabonete Suave",
      quantity: "3 unidades",
      category: "Higiene",
      bought: true
    }
  ];

  let items = loadItemsFromStorage();
  let currentCategory = 'Todos';
  let searchQuery = '';
  let lastDeletedItem = null; // Armazena o último item para a função "Desfazer"

  // --------------------------------------------------------------------------
  // 2. Elementos do DOM
  // --------------------------------------------------------------------------
  // Formulário de Adicionar
  const itemForm = document.getElementById('item-form');
  const itemNameInput = document.getElementById('item-name');
  const itemQtyInput = document.getElementById('item-qty');
  const itemCategorySelect = document.getElementById('item-category');

  // Busca e Filtros
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const categoryFilters = document.getElementById('category-filters');
  const countTodos = document.getElementById('count-todos');
  const countAlimentacao = document.getElementById('count-alimentacao');
  const countLimpeza = document.getElementById('count-limpeza');
  const countHigiene = document.getElementById('count-higiene');
  const countOutros = document.getElementById('count-outros');

  // Barra de Progresso
  const progressSummary = document.getElementById('progress-summary');
  const progressCheer = document.getElementById('progress-cheer');
  const progressPercentage = document.getElementById('progress-percentage');
  const progressFill = document.getElementById('progress-fill');

  // Lista e Itens
  const itemsListContainer = document.getElementById('items-list');
  const emptyListCard = document.getElementById('empty-list-card');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');
  const listItemsIndicator = document.getElementById('list-items-indicator');
  const listBottomActions = document.getElementById('list-bottom-actions');
  const clearBoughtBtn = document.getElementById('clear-bought-btn');
  const clearAllBtn = document.getElementById('clear-all-btn');

  // Ferramentas do Cabeçalho
  const copyListBtn = document.getElementById('copy-list-btn');

  // Modal de Edição
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const editItemId = document.getElementById('edit-item-id');
  const editItemName = document.getElementById('edit-item-name');
  const editItemQty = document.getElementById('edit-item-qty');
  const editItemCategory = document.getElementById('edit-item-category');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Toast e Desfazer
  const toastMessage = document.getElementById('toast-message');
  const toastText = document.getElementById('toast-text');
  const toastUndoBtn = document.getElementById('toast-undo-btn');
  let toastTimeout = null;

  // --------------------------------------------------------------------------
  // 3. Funções de Armazenamento (LocalStorage Seguro)
  // --------------------------------------------------------------------------

  function saveItemsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }

  function loadItemsFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultItems));
      return defaultItems;
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
      return defaultItems;
    }
  }

  // --------------------------------------------------------------------------
  // 4. Notificações Visuais Amigáveis (Toast com suporte a Desfazer)
  // --------------------------------------------------------------------------

  function showToast(text, canUndo = false) {
    if (!toastMessage) return;

    toastText.textContent = text;

    if (canUndo && lastDeletedItem) {
      toastUndoBtn.classList.remove('hidden');
    } else {
      toastUndoBtn.classList.add('hidden');
    }

    toastMessage.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      toastMessage.classList.remove('show');
      if (!canUndo) lastDeletedItem = null;
    }, 4000);
  }

  // Ação de Desfazer Exclusão
  toastUndoBtn.addEventListener('click', () => {
    if (!lastDeletedItem) return;

    items.splice(lastDeletedItem.index, 0, lastDeletedItem.data);
    saveItemsToStorage();
    renderList();

    const restoredName = lastDeletedItem.data.name;
    lastDeletedItem = null;
    showToast(`✓ "${restoredName}" foi recuperado!`, false);
  });

  // --------------------------------------------------------------------------
  // 5. Atualização da Barra de Progresso e Contadores
  // --------------------------------------------------------------------------

  function updateProgressAndCounts() {
    const total = items.length;
    const boughtCount = items.filter(i => i.bought).length;
    const percent = total > 0 ? Math.round((boughtCount / total) * 100) : 0;

    progressSummary.textContent = `${boughtCount} de ${total} ${total === 1 ? 'item comprado' : 'itens comprados'}`;
    progressPercentage.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;

    if (total === 0) {
      progressCheer.textContent = "Adicione itens acima para começar!";
    } else if (percent === 100) {
      progressCheer.textContent = "🎉 Maravilha! Tudo o que você precisava já foi comprado!";
    } else if (percent >= 50) {
      progressCheer.textContent = "👍 Mais da metade já está no seu carrinho!";
    } else if (percent > 0) {
      progressCheer.textContent = "🧺 Você já começou suas compras, continue assim!";
    } else {
      progressCheer.textContent = "Pronto para ir às compras!";
    }

    countTodos.textContent = total;
    countAlimentacao.textContent = items.filter(i => i.category === 'Alimentação').length;
    countLimpeza.textContent = items.filter(i => i.category === 'Limpeza').length;
    countHigiene.textContent = items.filter(i => i.category === 'Higiene').length;
    countOutros.textContent = items.filter(i => i.category === 'Outros').length;

    if (total > 0) {
      listBottomActions.classList.remove('hidden');
      clearBoughtBtn.style.display = boughtCount > 0 ? 'inline-block' : 'none';
    } else {
      listBottomActions.classList.add('hidden');
    }
  }

  // --------------------------------------------------------------------------
  // 6. Renderização da Lista de Compras com Ordenação Inteligente
  // --------------------------------------------------------------------------

  function renderList() {
    // 1. Filtragem por categoria
    let filtered = items.filter(item => {
      if (currentCategory === 'Todos') return true;
      return item.category === currentCategory;
    });

    // 2. Filtragem por busca em tempo real
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q) ||
        (item.quantity && item.quantity.toLowerCase().includes(q))
      );
    }

    // 3. Ordenação inteligente: Pendentes primeiro, já comprados no final
    const sorted = [...filtered].sort((a, b) => {
      if (a.bought === b.bought) return 0;
      return a.bought ? 1 : -1;
    });

    listItemsIndicator.textContent = `${sorted.length} ${sorted.length === 1 ? 'item' : 'itens'}`;

    // Estado vazio
    if (sorted.length === 0) {
      itemsListContainer.innerHTML = '';
      emptyListCard.classList.remove('hidden');

      if (searchQuery.trim() !== '') {
        emptyTitle.textContent = `Nenhum produto encontrado para "${searchQuery}"`;
        emptyDesc.textContent = 'Verifique a digitação ou toque no "X" para limpar a busca.';
      } else if (currentCategory !== 'Todos') {
        emptyTitle.textContent = `Nenhum item na área "${currentCategory}"`;
        emptyDesc.textContent = 'Você pode adicionar um item escolhendo essa área ou tocar no botão "✨ Todos" para ver a lista inteira.';
      } else {
        emptyTitle.textContent = 'Sua lista está vazia no momento';
        emptyDesc.textContent = 'Tudo o que você precisa fazer é escrever o nome do produto no formulário acima e tocar no botão verde "Adicionar à Lista".';
      }

      updateProgressAndCounts();
      return;
    }

    emptyListCard.classList.add('hidden');

    // Constrói os cartões com atributos data-id para delegação de eventos
    itemsListContainer.innerHTML = sorted.map(item => {
      let catEmoji = '📦';
      if (item.category === 'Alimentação') catEmoji = '🍎';
      if (item.category === 'Limpeza') catEmoji = '🧹';
      if (item.category === 'Higiene') catEmoji = '🧼';

      const boughtClass = item.bought ? 'is-bought' : '';
      const checkTitle = item.bought ? 'Marcar como não comprado' : 'Marcar como já comprado';

      return `
        <article class="item-card ${boughtClass}" data-id="${item.id}" role="listitem">
          
          <!-- Botão Grande de Marcar como Comprado -->
          <button 
            type="button" 
            class="btn-toggle-bought" 
            data-id="${item.id}" 
            title="${checkTitle}"
            aria-label="${checkTitle}: ${item.name}"
          >
            ✓
          </button>

          <!-- Dados e Informações do Item -->
          <div class="item-details">
            <div class="item-title-row">
              <span class="item-name">${escapeHTML(item.name)}</span>
              ${item.quantity ? `<span class="item-qty-badge">${escapeHTML(item.quantity)}</span>` : ''}
            </div>
            <span class="item-category-tag">
              ${catEmoji} ${escapeHTML(item.category)}
            </span>
          </div>

          <!-- Ações: Editar e Excluir -->
          <div class="item-actions-group">
            <button 
              type="button" 
              class="btn-edit" 
              data-id="${item.id}" 
              title="Corrigir nome ou quantidade"
              aria-label="Editar ${item.name}"
            >
              <span aria-hidden="true">✏️</span>
              <span>Editar</span>
            </button>

            <button 
              type="button" 
              class="btn-delete" 
              data-id="${item.id}" 
              title="Excluir este item da lista"
              aria-label="Excluir ${item.name}"
            >
              <span aria-hidden="true">🗑️</span>
              <span>Excluir</span>
            </button>
          </div>

        </article>
      `;
    }).join('');

    updateProgressAndCounts();
  }

  // --------------------------------------------------------------------------
  // 7. Delegação de Eventos na Lista de Itens (Alta Performance)
  // --------------------------------------------------------------------------
  itemsListContainer.addEventListener('click', (e) => {
    // 1. Marcar / Desmarcar como comprado
    const toggleBtn = e.target.closest('.btn-toggle-bought');
    if (toggleBtn) {
      const id = Number(toggleBtn.getAttribute('data-id'));
      toggleBought(id);
      return;
    }

    // 2. Editar item
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const id = Number(editBtn.getAttribute('data-id'));
      openEditModal(id);
      return;
    }

    // 3. Excluir item
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      const id = Number(deleteBtn.getAttribute('data-id'));
      deleteItem(id);
      return;
    }
  });

  // --------------------------------------------------------------------------
  // 8. Ações de Adicionar, Marcar e Excluir
  // --------------------------------------------------------------------------

  function addItem(e) {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const quantity = itemQtyInput.value.trim();
    const category = itemCategorySelect.value;

    if (!name) {
      itemNameInput.focus();
      showToast('⚠️ Por favor, digite o nome do produto.');
      return;
    }

    const newItem = {
      id: Date.now() + Math.floor(Math.random() * 100),
      name: name,
      quantity: quantity || '1',
      category: category,
      bought: false
    };

    items.unshift(newItem);
    saveItemsToStorage();

    itemNameInput.value = '';
    itemQtyInput.value = '';
    itemNameInput.focus();

    renderList();
    showToast(`✓ "${newItem.name}" adicionado à lista!`);
  }

  function toggleBought(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.bought = !item.bought;
    saveItemsToStorage();
    renderList();

    if (item.bought) {
      showToast(`✓ "${item.name}" marcado como comprado!`);
    } else {
      showToast(`Desmarcado: "${item.name}" voltou para a lista.`);
    }
  }

  function deleteItem(id) {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;

    const item = items[index];
    lastDeletedItem = { index, data: { ...item } };

    items.splice(index, 1);
    saveItemsToStorage();
    renderList();

    showToast(`🗑️ "${item.name}" foi excluído.`, true);
  }

  // --------------------------------------------------------------------------
  // 9. Edição de Itens (Modal)
  // --------------------------------------------------------------------------

  function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    editItemId.value = item.id;
    editItemName.value = item.name;
    editItemQty.value = item.quantity || '';
    editItemCategory.value = item.category;

    editModal.classList.remove('hidden');
    editItemName.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = Number(editItemId.value);
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newName = editItemName.value.trim();
    if (!newName) {
      editItemName.focus();
      return;
    }

    item.name = newName;
    item.quantity = editItemQty.value.trim() || '1';
    item.category = editItemCategory.value;

    saveItemsToStorage();
    closeEditModal();
    renderList();
    showToast(`✓ "${item.name}" atualizado com sucesso!`);
  });

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // Fecha clicando no fundo escuro (backdrop)
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Fecha modal com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
      closeEditModal();
    }
  });

  // --------------------------------------------------------------------------
  // 10. Compartilhar / Copiar Lista para o WhatsApp (com Fallback Universal)
  // --------------------------------------------------------------------------

  function copyListForWhatsApp() {
    if (items.length === 0) {
      showToast('⚠️ Sua lista está vazia para copiar.');
      return;
    }

    let text = `🏡 *Lista de Compras da Casa* 🧺\n\n`;

    const pending = items.filter(i => !i.bought);
    const bought = items.filter(i => i.bought);

    if (pending.length > 0) {
      text += `🛒 *Ainda Falta Comprar (${pending.length}):*\n`;
      pending.forEach(item => {
        const qty = item.quantity ? ` (${item.quantity})` : '';
        text += `▫️ ${item.name}${qty} [${item.category}]\n`;
      });
      text += `\n`;
    }

    if (bought.length > 0) {
      text += `✅ *Já Comprados (${bought.length}):*\n`;
      bought.forEach(item => {
        const qty = item.quantity ? ` (${item.quantity})` : '';
        text += `~▫️ ${item.name}${qty}~\n`;
      });
    }

    text += `\nOrganizado com carinho pela Lista da Casa!`;

    // 1. Tenta API moderna do Clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('📋 Lista copiada! É só colar no WhatsApp!'))
        .catch(() => fallbackCopy(text));
    } else {
      // 2. Fallback universal (document.execCommand) para file:// e navegadores antigos
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        showToast('📋 Lista copiada! É só colar no WhatsApp!');
      } else {
        showToast('⚠️ Selecione e copie manualmente o texto.');
      }
    } catch (err) {
      showToast('⚠️ Não foi possível copiar automaticamente.');
    }
  }

  copyListBtn.addEventListener('click', copyListForWhatsApp);

  // --------------------------------------------------------------------------
  // 11. Limpar Itens
  // --------------------------------------------------------------------------

  function clearBoughtItems() {
    const boughtCount = items.filter(i => i.bought).length;
    if (boughtCount === 0) return;

    const confirmMessage = boughtCount === 1 
      ? 'Deseja remover da lista o item que você já comprou?' 
      : `Deseja remover da lista os ${boughtCount} itens que você já comprou?`;

    if (window.confirm(confirmMessage)) {
      items = items.filter(i => !i.bought);
      saveItemsToStorage();
      renderList();
      showToast('Itens já comprados foram limpos!');
    }
  }

  function clearAllItems() {
    if (items.length === 0) return;

    if (window.confirm('Tem certeza de que deseja apagar TODOS os itens da sua lista de compras?')) {
      items = [];
      saveItemsToStorage();
      renderList();
      showToast('Sua lista foi esvaziada.');
    }
  }

  // --------------------------------------------------------------------------
  // 12. Busca em Tempo Real
  // --------------------------------------------------------------------------

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    renderList();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    renderList();
  });

  // --------------------------------------------------------------------------
  // 13. Sanitização Simples (Evitar quebras no DOM)
  // --------------------------------------------------------------------------
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // 14. Event Listeners Globais
  // --------------------------------------------------------------------------
  itemForm.addEventListener('submit', addItem);

  categoryFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    categoryFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    currentCategory = chip.getAttribute('data-category');
    renderList();
  });

  clearBoughtBtn.addEventListener('click', clearBoughtItems);
  clearAllBtn.addEventListener('click', clearAllItems);

  // --------------------------------------------------------------------------
  // 15. Inicialização
  // --------------------------------------------------------------------------
  renderList();

});
