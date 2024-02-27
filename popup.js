// Globally track the order of the slots
let slotOrder = [];
const container = document.getElementById('shortcutList');
const markTabButton = document.getElementById('markTabButton');

function debugLog(message, level = 'log') {
    if (isDevelopmentMode()) {
        console[level](message);
    }
}

function isDevelopmentMode() {
    return !('update_url' in chrome.runtime.getManifest());
}

function initializePopup() {
    getCurrentTabUrl();
    updateShortcutList();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', initializePopup);

function updateShortcutList() {
    try {
        chrome.storage.sync.get(['shortcuts'], function (result) {
            const shortcuts = result.shortcuts || {};
            container.innerHTML = '';
            slotOrder = [];
            Object.keys(shortcuts).sort().forEach(slot => {
                slotOrder.push(slot);
                createShortcutItem(slot, shortcuts[slot]);
            });
            setupDragAndDrop();
            selectFirstEmptySlot();
        });
    } catch (error) {
        debugLog(error, 'error');
    }
}

function createShortcutItem(slot, shortcut) {
    let item = document.createElement('div');
    item.setAttribute('draggable', true);
    item.setAttribute('id', `shortcut-${slot}`);
    item.setAttribute('data-slot', slot);
    item.classList.add('shortcut-item');

    // Include a drag handle icon
    const dragHandle = document.createElement('span');
    dragHandle.classList.add('drag-handle');
    dragHandle.innerHTML = '&#9776;'; // Using the HTML entity for the "hamburger" icon

    item.appendChild(dragHandle);
    // Set the inner HTML for the item's content
    let itemContent = document.createElement('span');
    itemContent.innerHTML = `
                Ctrl+Shift+${slot} 
                <a href="${shortcut.url}" target="_blank" title="${shortcut.title}">
                    ${new URL(shortcut.url).hostname}
                </a>
            `;
    item.appendChild(itemContent);
    // Create remove button
    let removeButton = document.createElement('button');
    removeButton.textContent = 'X';
    removeButton.classList.add('remove-button');
    // Add event listener to the remove button
    removeButton.addEventListener('click', function () {
        removeShortcut(slot);
    });

    // Append the remove button to the item
    item.appendChild(removeButton);
    shortcutList.appendChild(item);
}

// ===============
// Event Handlers
function handleMarkTabClick() {
    const slotSelect = document.getElementById('slotSelect');
    const slot = slotSelect.value;
    const url = document.getElementById('urlDisplay').value;
    const title = document.getElementById('titleDisplay').textContent; // Assume you have an element to display the title
    try {
        // Check for duplicate URLs before adding a new shortcut
        chrome.storage.sync.get(['shortcuts'], function (result) {
            let shortcuts = result.shortcuts || {};
            let isDuplicate = Object.values(shortcuts).some(shortcut => shortcut.url === url);

            if (isDuplicate) {
                alert("This URL is already assigned to a shortcut.");
                return;
            }

            addShortcut(slot, url, title); // Add the shortcut if it's not a duplicate
        });
    } catch (error) {
        debugLog(error, 'error');
    }
}

// ===============
function setupEventListeners() {
    // Set focus on the "Mark This Tab" button
    markTabButton.focus();
    markTabButton.addEventListener('click', handleMarkTabClick);
}

// ===============
// Drag and Drop
// ===============
function setupDragAndDrop() {
    const draggables = container.querySelectorAll('.shortcut-item');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', handleDragStart);
        draggable.addEventListener('dragend', handleDragEnd);
    });

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
        container.appendChild(draggable);
    } else {
        container.insertBefore(draggable, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const draggableElement = document.getElementById(id);
    const afterElement = getDragAfterElement(container, e.clientY);

    if (afterElement == null) {
        container.appendChild(draggableElement);
    } else {
        container.insertBefore(draggableElement, afterElement);
    }

    // Once the element has been dropped, we need to refresh the order
    updateSlotOrderFromDOM();
}


function updateShortcutsOrder() {
    function updateShortcutsOrder() {
        let updatedOrder = {};  // Declare updatedOrder outside the try block to increase its scope

        try {
            // Fetch the current shortcuts
            // Logic to update the slot order based on current DOM state after drag-and-drop
            container.querySelectorAll('.shortcut-item').forEach((item, index) => {
                const slot = item.dataset.slot;
                updatedOrder[index] = {...slotOrder[slot]}; // Assuming slotOrder is an object with slot keys
            });
        } catch (error) {
            debugLog(`Error fetching/reordering shortcuts order: ${error}`, "error");
            return; // If there's an error, return early
        }

        try {
            // Save the reordered shortcuts
            chrome.storage.sync.set({shortcuts: updatedOrder}, function () {
                updateShortcutList(); // Redisplay the shortcuts with the new order
            });
        } catch (error) {
            debugLog(`Error updating shortcuts order: ${error}`, "error");
        }
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.shortcut-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return {offset: offset, element: child};
        } else {
            return closest;
        }
    }, {offset: Number.NEGATIVE_INFINITY}).element;
}

// =============
// Utility Functions
// =============
/**
 * Removes the shortcut at the specified slot.
 * @param {number} slot - The slot of the shortcut to be removed.
 */
function removeShortcut(slot) {
    try {
        chrome.storage.sync.get(['shortcuts'], function (result) {
            const shortcuts = result.shortcuts || {};
            if (shortcuts[slot]) {
                delete shortcuts[slot]; // Remove the shortcut from the object
                chrome.storage.sync.set({shortcuts}, function () {
                    updateShortcutList(); // Refresh the list of shortcuts
                    selectFirstEmptySlot(); // Select the first empty slot after removal
                });
            }
        });
    } catch (error) {
        debugLog(`Error removing shortcut: ${error}`, "error");
    }
}

function updateSlotOrderFromDOM() {
    slotOrder = Array.from(container.children).map(item => item.dataset.slot);
    updateShortcutsOrder();
}

function updateShortcutsOrder() {
    chrome.storage.sync.get(['shortcuts'], function (result) {
        let currentShortcuts = result.shortcuts || {};
        let updatedShortcuts = {};

        slotOrder.forEach((slot, index) => {
            updatedShortcuts[index] = currentShortcuts[slot];
        });

        chrome.storage.sync.set({shortcuts: updatedShortcuts}, function () {
            if (chrome.runtime.lastError) {
                debugLog(`Error saving updated shortcuts: ${chrome.runtime.lastError}`, "error");
            } else {
                debugLog('Updated shortcuts successfully.');
                updateShortcutList();
            }
        });
    });
}

function selectFirstEmptySlot() {
    chrome.storage.sync.get(['shortcuts'], function (result) {
        let shortcuts = result.shortcuts || {};
        let filledSlots = Object.keys(shortcuts);
        let slotSelect = document.getElementById('slotSelect');
        slotSelect.innerHTML = '';

        for (let i = 0; i < 3; i++) {
            let option = document.createElement('option');
            option.value = i;
            option.textContent = `Slot ${i} (Ctrl + Shift + ${i})`;
            if (!filledSlots.includes(i.toString())) {
                slotSelect.appendChild(option);
            }
        }

        if (slotSelect.options.length === 0) {
            let option = document.createElement('option');
            option.textContent = "All slots are full";
            slotSelect.appendChild(option);
            slotSelect.disabled = true;
            markTabButton.disabled = true;
        } else {
            slotSelect.disabled = false;
            markTabButton.disabled = false;
        }
    });
}

function getCurrentTabUrl() {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        let currentTab = tabs[0];
        document.getElementById('urlDisplay').value = currentTab.url;
        document.getElementById('titleDisplay').textContent = currentTab.title;
    });
}

function addShortcut(slot, url, title) {
    chrome.storage.sync.get(['shortcuts'], function (result) {
        let shortcuts = result.shortcuts || {};
        shortcuts[slot] = {url, title};
        chrome.storage.sync.set({shortcuts}, function () {
            debugLog(`Shortcut saved for slot ${slot}.`);
            updateShortcutList();
        });
    });
}

