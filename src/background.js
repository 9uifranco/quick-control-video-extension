// Background service worker for the video toggle extension
let lastPausedTabs = [];

chrome.storage.local.get(['lastPausedTabs'], (result) => {
    if (Array.isArray(result.lastPausedTabs)) {
        lastPausedTabs = result.lastPausedTabs;
    }
});

async function injectOnTabs(tabs, scriptOptions) {
    for (const tab of tabs) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: typeof tab === 'number' ? tab : tab.id },
                ...scriptOptions
            });
        } catch (err) {
            console.warn(`Failed to inject on tab ${typeof tab === 'number' ? tab : tab.id}:`, err.message);
        }
    }
}

async function getTabsWithVideo(allTabs, filter) {
    const matched = [];
    for (const tab of allTabs) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: filter
            });
            if (results?.[0]?.result) matched.push(tab);
        } catch (err) {
            console.warn(`Cannot access tab ${tab.id}:`, err.message);
        }
    }
    return matched;
}

async function seekAll(amount) {
    const allTabs = await chrome.tabs.query({});
    const withVideo = await getTabsWithVideo(allTabs, () =>
        document.querySelectorAll('video').length > 0
    );
    await injectOnTabs(withVideo, {
        func: (seekAmount) => {
            const videos = document.querySelectorAll('video');
            if (videos.length === 0) return;
            let target = videos[0];
            if (videos.length > 1) {
                const visible = [...videos].filter(v => {
                    const r = v.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                });
                if (visible.length > 0) {
                    target = visible.reduce((a, b) =>
                        b.offsetWidth * b.offsetHeight > a.offsetWidth * a.offsetHeight ? b : a
                    );
                }
            }
            target.currentTime = Math.max(0, Math.min(target.duration, target.currentTime + seekAmount));
        },
        args: [amount]
    });
}

const commands = {
    async "play-pause"() {
        const allTabs = await chrome.tabs.query({});
        const playing = await getTabsWithVideo(allTabs, () =>
            [...document.querySelectorAll('video')].some(v => !v.paused)
        );

        if (playing.length > 0) {
            lastPausedTabs = playing.map(t => t.id);
            chrome.storage.local.set({ lastPausedTabs });
            await injectOnTabs(playing, { files: ["scripts/videoToggle.js"] });
        } else if (lastPausedTabs.length > 0) {
            await injectOnTabs(lastPausedTabs, { files: ["scripts/videoToggle.js"] });
            lastPausedTabs = [];
            chrome.storage.local.set({ lastPausedTabs });
        } else {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab) await injectOnTabs([activeTab], { files: ["scripts/videoToggle.js"] });
        }
    },

    "seek-forward": () => seekAll(5),
    "seek-backward": () => seekAll(-5),
};

chrome.commands.onCommand.addListener(async (command) => {
    const handler = commands[command];
    if (handler) await handler();
});
