/**
 * Listens for commands and performs actions based on the command received.
 */
chrome.commands.onCommand.addListener((command) => {
    if (command === "open-google") {
        chrome.tabs.create({url: "https://www.google.com"});
    }
});

/**
 * Listens for commands related to custom shortcuts and navigates to the specified shortcut.
 */
chrome.commands.onCommand.addListener((command) => {
    const keyMatch = command.match(/open-custom-shortcut-(\d)/);
    if (keyMatch) {
        const key = keyMatch[1];
        navigateToShortcut(key);
    }
});

/**
 * Navigates to the specified shortcut by opening a new tab or focusing an existing one if the URL is assigned.
 *
 * @param {number} index - the index of the shortcut to navigate to
 * @return {void}
 */
function navigateToShortcut(index) {
    // Retrieve the shortcuts from Chrome storage
    chrome.storage.sync.get(['shortcuts'], function (result) {
        // Get the shortcuts from the result, or an empty object if not found
        const shortcuts = result.shortcuts || {};
        // Get the shortcut object at the specified index
        const shortcutObj = shortcuts[index];
        // Check if the shortcut object and its URL exist
        if (shortcutObj && shortcutObj.url) {
            // Check if the tab with the URL is already open
            chrome.tabs.query({}, function (tabs) {
                // Find the existing tab with the same URL
                const existingTab = tabs.find(tab => tab.url === shortcutObj.url);
                // If the tab exists, focus on it and its window
                if (existingTab) {
                    chrome.tabs.update(existingTab.id, {active: true});
                    chrome.windows.update(existingTab.windowId, {focused: true});
                } else {
                    // If the tab doesn't exist, open a new tab with the URL
                    chrome.tabs.create({url: shortcutObj.url});
                }
            });
        } else {
            // Log a message if no URL is assigned for the specified shortcut index
            console.log(`No URL assigned for shortcut ${index}.`);
        }
    });
}
