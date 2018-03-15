
async function captureThumbnail(tabId) {

	var data = await browser.tabs.captureTab(tabId, {format: 'jpeg', quality: 25});
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

		updateThumbnail(tabId);
	};

	img.src = data;
}
