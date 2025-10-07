// --- CONSTANTES Y VARIABLES GLOBALES ---
const LS_KEY_ACCOUNTS = 'waSenderAccounts'; // Almacena todos los usuarios
const LS_KEY_CURRENT_USER = 'waCurrentUser'; // Almacena el correo del usuario actualmente logueado
const LS_KEY_CONTACTS_PREFIX = 'waSenderContacts_'; // Prefijo para datos de contactos por usuario
window.MAX_CONTACTS = 100;
window.DOMAIN_REQUIRED = '@galvanissa.com';

window.CATEGORY_MAP = {
    cartera: 'Clientes de Cartera',
    top: 'Clientes que Compran Más',
    occasional: 'Clientes que Compran De Vez en Cuando',
    recover: 'Clientes que Necesito Recuperar',
    project: 'Clientes de Proyectos'
};

window.currentUser = null;
window.contacts = [];
window.editingDocId = null; // Usaremos el ID único del contacto para la edición

// --- UTILIDADES DE LOCAL STORAGE ---

// Cargar todas las cuentas
const getAccounts = () => {
    const json = localStorage.getItem(LS_KEY_ACCOUNTS);
    return json ? JSON.parse(json) : {};
};

// Guardar todas las cuentas
const saveAccounts = (accounts) => {
    localStorage.setItem(LS_KEY_ACCOUNTS, JSON.stringify(accounts));
};

// Obtener la clave de contactos específica para el usuario
const getUserContactsKey = (email) => {
    return LS_KEY_CONTACTS_PREFIX + email.toLowerCase();
};

// Cargar contactos del usuario actual
const loadContacts = () => {
    if (!window.currentUser) {
        window.contacts = [];
        return;
    }
    const key = getUserContactsKey(window.currentUser.email);
    const json = localStorage.getItem(key);
    const loadedContacts = json ? JSON.parse(json) : [];
    window.contacts = loadedContacts;
    window.logMessage(`Se cargaron ${window.contacts.length} clientes del almacenamiento local.`);
    window.filterAndSearchContacts();
};

// Guardar contactos del usuario actual
const saveContacts = () => {
    if (!window.currentUser) return;
    const key = getUserContactsKey(window.currentUser.email);
    localStorage.setItem(key, JSON.stringify(window.contacts));
};

// --- AUTENTICACIÓN ---

window.handleUserLogin = (user) => {
    window.currentUser = user;
    localStorage.setItem(LS_KEY_CURRENT_USER, JSON.stringify(user));
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('authStatus').textContent = `Bienvenido: ${user.email}`;
    document.getElementById('authStatus').classList.remove('hidden');
    window.logMessage('Inicio de sesión exitoso. Cargando tus clientes...');
    loadContacts();
    window.cancelEdit();
};

window.handleUserLogout = () => {
    window.currentUser = null;
    localStorage.removeItem(LS_KEY_CURRENT_USER);
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('authStatus').classList.add('hidden');
    window.contacts = [];
    window.filterAndSearchContacts();
    window.logMessage('Sesión cerrada. Inicia sesión para continuar.');
    document.getElementById('authMessage').textContent = '';
};

window.signIn = () => {
    const email = document.getElementById('authEmail').value.toLowerCase();
    const password = document.getElementById('authPassword').value;
    document.getElementById('authMessage').textContent = '';

    if (!email || !password) {
        document.getElementById('authMessage').textContent = 'Error: Correo y contraseña son obligatorios.';
        return;
    }

    const accounts = getAccounts();
    const user = accounts[email];

    if (user && user.password === password) {
        window.handleUserLogin(user);
    } else {
        window.logMessage('Error: Credenciales incorrectas o usuario no encontrado.', true);
        document.getElementById('authMessage').textContent = 'Error: Credenciales incorrectas o usuario no encontrado.';
    }
};

window.register = () => {
    const email = document.getElementById('authEmail').value.toLowerCase();
    const password = document.getElementById('authPassword').value;
    document.getElementById('authMessage').textContent = '';

    if (!email.endsWith(window.DOMAIN_REQUIRED)) {
        document.getElementById('authMessage').textContent = `Error: El correo debe ser del dominio ${window.DOMAIN_REQUIRED}`;
        return;
    }
    if (password.length < 6) {
        document.getElementById('authMessage').textContent = 'Error: La contraseña debe tener al menos 6 caracteres.';
        return;
    }

    const accounts = getAccounts();
    if (accounts[email]) {
        document.getElementById('authMessage').textContent = 'Error: Esta cuenta ya existe.';
        return;
    }

    const newUser = { email, password };
    accounts[email] = newUser;
    saveAccounts(accounts);
    console.log(`[GALVANISSA PASSWORD] El usuario ${email} registró la contraseña: ${password}`);
    window.logMessage(`¡Registro exitoso para ${email}! Su contraseña está visible en la consola.`, false);
    window.handleUserLogin(newUser);
};

window.signOutUser = () => {
    window.handleUserLogout();
};

// --- CRUD DE CONTACTOS (LOCAL STORAGE IMPLEMENTATION) ---

window.addOrUpdateContact = () => {
    if (!window.currentUser) return window.logMessage('Error: Debes iniciar sesión para guardar clientes.', true);

    const firstName = document.getElementById('inputFirstName').value.trim();
    const lastName = document.getElementById('inputLastName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const category = document.getElementById('inputCategory').value;
    let projectInfo = category === 'project' ? document.getElementById('inputProjectInfo').value.trim() : '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    if (!firstName || !cleanPhone) {
        return window.logMessage('Error: El Nombre y el Teléfono son obligatorios.', true);
    }

    if (!window.editingDocId && window.contacts.length >= window.MAX_CONTACTS) {
        return window.logMessage(`Error: Se ha alcanzado el límite de ${window.MAX_CONTACTS} clientes.`, true);
    }

    const isDuplicate = window.contacts.some(c => c.phone === cleanPhone && c.docId !== window.editingDocId);
    if (isDuplicate) {
        return window.logMessage(`Advertencia: El número ${cleanPhone} ya existe en tu lista.`, true);
    }

    const contactData = { 
        firstName: firstName,
        lastName: lastName,
        phone: cleanPhone,
        category: category,
        projectInfo: projectInfo,
        createdAt: new Date().toISOString()
    };

    if (window.editingDocId) {
        const index = window.contacts.findIndex(c => c.docId === window.editingDocId);
        if (index !== -1) {
            window.contacts[index] = { ...contactData, docId: window.editingDocId };
            window.logMessage(`Cliente Editado: ${firstName} ${lastName}`);
        }
    } else {
        const newDocId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        window.contacts.push({ ...contactData, docId: newDocId });
        window.logMessage(`Cliente Guardado: ${firstName} ${lastName}`);
    }

    saveContacts();
    loadContacts();
    window.cancelEdit();
};

window.deleteContactByPhone = (phone) => {
    if (!window.currentUser) return window.logMessage('Error: Debes iniciar sesión para eliminar clientes.', true);
    
    const contact = window.contacts.find(c => c.phone === phone);
    if (!contact) {
        return window.logMessage(`Error: Cliente con teléfono ${phone} no encontrado.`, true);
    }
    
    const contactName = `${contact.firstName} ${contact.lastName}`;
    window.showCustomConfirmation(`¿Seguro que quieres eliminar a ${contactName} de tu lista?`, () => {
        window.contacts = window.contacts.filter(c => c.phone !== phone);
        saveContacts();
        loadContacts();
        window.logMessage(`Cliente eliminado: ${contactName}`);
    });
};

window.clearAllContacts = () => {
    if (!window.currentUser) return window.logMessage('Error: Debes iniciar sesión para limpiar clientes.', true);
    
    window.showCustomConfirmation(`¡ALERTA! Esto eliminará TUS ${window.contacts.length} clientes permanentemente. ¿Continuar?`, () => {
        window.contacts = [];
        saveContacts();
        loadContacts();
        window.logMessage('¡Todos tus clientes han sido eliminados del almacenamiento local!');
    });
};

// --- FUNCIONES DE UI Y LÓGICA (GLOBALES) ---

window.toggleProjectInfoInput = () => {
    const category = document.getElementById('inputCategory').value;
    const projectInfoInput = document.getElementById('inputProjectInfo');
    projectInfoInput.classList.toggle('hidden', category !== 'project');
};

window.setFormMode = (mode, contact = null) => {
    window.editingDocId = contact ? contact.docId : null;
    const title = document.getElementById('formTitle');
    const button = document.getElementById('addEditButton');
    const cancelButton = document.getElementById('cancelEditButton');

    if (mode === 'edit' && contact) {
        title.textContent = `1. Editando Cliente: ${contact.firstName} ${contact.lastName}`;
        button.textContent = 'Guardar Cambios';
        button.classList.remove('bg-green-500');
        button.classList.add('bg-blue-900');
        cancelButton.classList.remove('hidden');
    } else { 
        title.textContent = '1. Agregar Nuevo Cliente';
        button.textContent = 'Guardar Cliente';
        button.classList.remove('bg-blue-900');
        button.classList.add('bg-green-500');
        cancelButton.classList.add('hidden');
        document.getElementById('inputFirstName').value = '';
        document.getElementById('inputLastName').value = '';
        document.getElementById('inputPhone').value = '';
        document.getElementById('inputCategory').value = 'cartera';
        document.getElementById('inputProjectInfo').value = '';
        window.toggleProjectInfoInput();
    }
};

window.startEditByPhone = (phone) => {
    const contact = window.contacts.find(c => c.phone === phone);
    if (contact) {
        document.getElementById('inputFirstName').value = contact.firstName;
        document.getElementById('inputLastName').value = contact.lastName;
        document.getElementById('inputPhone').value = contact.phone;
        document.getElementById('inputCategory').value = contact.category;
        document.getElementById('inputProjectInfo').value = contact.projectInfo || '';
        window.toggleProjectInfoInput();
        window.setFormMode('edit', contact);
    } else {
        window.logMessage(`Error: Cliente con teléfono ${phone} no encontrado.`, true);
    }
};

window.cancelEdit = () => {
    window.setFormMode('add');
};

window.logMessage = (message, isError = false) => {
    const log = document.getElementById('log');
    if (!log) return; 
    
    const messageElement = document.createElement('span');
    messageElement.textContent = message + '\n';
    messageElement.className = isError ? 'text-red-600 font-bold' : 'text-gray-700';
    log.appendChild(messageElement);
    log.scrollTop = log.scrollHeight;
};

window.showCustomConfirmation = (message, onConfirm) => {
    const log = document.getElementById('log');
    if (!log) return;

    log.querySelectorAll('.confirmation-dialog').forEach(el => el.remove());

    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'confirmation-dialog p-3 bg-red-100 border border-red-400 rounded-lg my-2 text-sm';
    
    const p = document.createElement('p');
    p.textContent = message;
    confirmationDiv.appendChild(p);

    const btnYes = document.createElement('button');
    btnYes.textContent = 'Sí, Confirmar';
    btnYes.className = 'mt-2 mr-2 p-1 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition';
    btnYes.onclick = () => {
        log.removeChild(confirmationDiv);
        onConfirm();
    };

    const btnNo = document.createElement('button');
    btnNo.textContent = 'Cancelar';
    btnNo.className = 'mt-2 p-1 px-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition';
    btnNo.onclick = () => {
        log.removeChild(confirmationDiv);
    };

    confirmationDiv.appendChild(btnYes);
    confirmationDiv.appendChild(btnNo);
    log.appendChild(confirmationDiv);
    log.scrollTop = log.scrollHeight;
};

window.filterAndSearchContacts = () => {
    const searchClient = document.getElementById('searchClient');
    const filterCategory = document.getElementById('filterCategory');
    if (!searchClient || !filterCategory) return;
    
    const searchTerm = searchClient.value.toLowerCase().trim();
    const filterValue = filterCategory.value;
    
    let filteredContacts = window.contacts;

    if (filterValue !== 'all') {
        filteredContacts = filteredContacts.filter(c => c.category === filterValue);
    }

    if (searchTerm) {
        filteredContacts = filteredContacts.filter(c => 
            c.firstName.toLowerCase().includes(searchTerm) || 
            c.lastName.toLowerCase().includes(searchTerm)
        );
    }

    window.renderFilteredContacts(filteredContacts);
};

window.renderFilteredContacts = (filteredContacts) => {
    const listContainer = document.getElementById('contactList');
    const countElement = document.getElementById('contactCount');
    if (!listContainer || !countElement) return;

    listContainer.innerHTML = '';
    
    countElement.textContent = `Mostrando ${filteredContacts.length} / ${window.MAX_CONTACTS} clientes (Total Tuyo: ${window.contacts.length})`;

    if (filteredContacts.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 italic p-4 text-center">No hay clientes que coincidan con los filtros.</p>';
        return;
    }

    filteredContacts.forEach((contact) => {
        const phoneForAction = contact.phone; 
        const fullName = `${contact.firstName} ${contact.lastName}`;
        const categoryLabel = window.CATEGORY_MAP[contact.category] || contact.category;
        const projectDisplay = contact.category === 'project' && contact.projectInfo
            ? `<span class="text-xs text-orange-600 italic">(${contact.projectInfo.substring(0, 30)}...)</span>`
            : '';

        const item = document.createElement('div');
        item.className = 'contact-item flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0';
        item.innerHTML = `
            <div class="flex flex-col flex-grow min-w-0 pr-2">
                <div class="font-semibold truncate text-gray-800">${fullName} ${projectDisplay}</div>
                <div class="text-xs text-blue-500 font-medium">${categoryLabel}</div>
                <span class="text-xs text-gray-500">${contact.phone}</span>
            </div>
            <div class="flex space-x-2 flex-shrink-0">
                <button onclick="sendSingleContactByPhone('${phoneForAction}')" 
                        class="text-xs font-semibold px-2 py-1 rounded-lg bg-green-500 text-white hover:bg-green-600 transition">
                    Enviar
                </button>
                <button onclick="startEditByPhone('${phoneForAction}')" 
                        class="edit-button text-xs font-semibold px-2 py-1 rounded-lg transition">
                    Editar
                </button>
                <button onclick="deleteContactByPhone('${phoneForAction}')" 
                        class="text-xs font-semibold px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition">
                    Eliminar
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    });
};

window.dragStart = (event, variable) => {
    event.dataTransfer.setData("text/plain", variable);
};

window.allowDrop = (event) => {
    event.preventDefault();
};

window.drop = (event) => {
    event.preventDefault();
    const variable = event.dataTransfer.getData("text/plain");
    const textarea = document.getElementById('messageTemplate');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);

    textarea.value = newText;
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
};

window.sendSingleContactByPhone = (phone) => {
    const contact = window.contacts.find(c => c.phone === phone);
    
    if (!contact) {
        window.logMessage(`Error: Cliente con teléfono ${phone} no encontrado.`, true);
        return;
    }

    const messageTemplate = document.getElementById('messageTemplate').value.trim();

    if (!messageTemplate) {
        window.logMessage('Error: Escribe el mensaje que deseas enviar en la plantilla (sección 2).', true);
        return;
    }

    let personalizedMessage = messageTemplate;
    personalizedMessage = personalizedMessage.replace(/{{firstName}}/g, contact.firstName);
    personalizedMessage = personalizedMessage.replace(/{{lastName}}/g, contact.lastName);
    personalizedMessage = personalizedMessage.trim();

    const waLink = `https://web.whatsapp.com/send?phone=${contact.phone}&text=${encodeURIComponent(personalizedMessage)}`;
    
    window.logMessage(`\n--- Envío Individual ---`);
    window.logMessage(`> Abriendo chat para ${contact.firstName} (${contact.phone})...`);
    window.open(waLink, '_blank');
    window.logMessage(`> ✅ Chat abierto. Recuerda hacer clic en 'Enviar' manualmente en la nueva pestaña.`);
};

// Comprobar si hay un usuario en sesión al cargar la página
const checkCurrentUser = () => {
    const userJson = localStorage.getItem(LS_KEY_CURRENT_USER);
    if (userJson) {
        const user = JSON.parse(userJson);
        window.handleUserLogin(user);
    } else {
        window.handleUserLogout();
    }
};

// Iniciar la comprobación al cargar la página
checkCurrentUser();
