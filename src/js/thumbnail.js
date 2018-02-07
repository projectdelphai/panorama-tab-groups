
async function storeThumbnail(tabId, data) {

	var img = new Image;

	img.onload = async function() {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		canvas.width = 500;
		canvas.height = canvas.width * (this.height / this.width);

		//ctx.imageSmoothingEnabled = true;
		//ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

		var thumbnail = canvas.toDataURL('image/jpeg', 0.7);

		await browser.sessions.setTabValue(tabId, 'thumbnail', thumbnail);

		var tabs = await browser.tabs.query({url: browser.extension.getURL("view.html"), currentWindow: true});

		if(tabs.length > 0) {
			browser.tabs.sendMessage(tabs[0].id, JSON.stringify({name: 'updateThumbnail', value: tabId}));
		};
	};

	img.src = data;
}

async function captureThumbnail(tabId) {
	var imageData = await browser.tabs.captureVisibleTab(null, {format: 'jpeg', quality: 25});
	storeThumbnail(tabId, imageData);
}

function storeScreenshot_ac(activeInfo) {
	browser.tabs.get(activeInfo.tabId).then(tab => {
		if(tab.status == 'complete') {
			captureThumbnail(tab.id);
		}
	});
}

function storeScreenshot_up(tabId, changeInfo, tab) {
	if(changeInfo.status == 'complete' && tab.active == true) {
		captureThumbnail(tab.id);
	}
}

browser.tabs.onActivated.addListener(storeScreenshot_ac);
browser.tabs.onUpdated.addListener(storeScreenshot_up);
