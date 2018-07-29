/** @licence <https://raw.githubusercontent.com/mangabuta/dump_images/master/LICENSE> */
(function() {
	'use strict';

	// Checks whether the URL is correct. And then, gets the character ID from it.
	var matches = window.location.href.match(/^https:\/\/hiroba\.dqx\.jp\/sc\/character\/([0-9]+)\/picture/);
	if (!matches) {
		alert('「冒険日誌」の「思い出アルバム」に移動してから、再度本ブックマークを実行してください。');
		return;
	}
	var baseUrl = matches[0] + '/page/';
	var charId = matches[1];

	var images = [];

	// Creates and displays own content box.
	$('#bookmarklet-dump-images').remove();
	$('#contentArea .cttBox .contentsFrameArea').prepend('<div id="bookmarklet-dump-images" style="margin-bottom: 20px; padding: 0px 32px 20px 20px;"></div>');
	$('#bookmarklet-dump-images').append('<div class="newsBox"><h2 class="tit_note tit_icon">DQXアルバム画像一括保存ブックマークレット</h2><h3 class="tit_compass"></h3></div>');

	// Creates function calls.
	var callbacks = [];
	var pageNum = 1 + parseInt($('a.pagerBottom').attr('href').replace(/^.*\/(\d+)\/*$/, '$1'), 10);
	for (var i = 0; i < pageNum; i++) {
		/* jshint loopfunc: true */
		callbacks.push((function(index) {
			return function() {
				var d = $.Deferred();
				setTimeout(function() {
					// Gets the playlog pages and analyzes them.
					$.get(baseUrl + index, function(data) {
						$.each($(data).find('#pictureList tr'), function() {
							var showLargePict = $(this).find('a.showLargePict');
							var m = showLargePict.attr('rel').match(/(\d+)\/picture\/detail\/(\d+)/);
							var imageUrl = (m && m.length == 3) ? 'http://img.dqx.jp/smpicture/download/webpicture/' + m[1] + '/original/' + m[2] + '/?dl' : '';
							var thumbnailUrl = (m && m.length == 3) ? 'http://img.dqx.jp/smpicture/download/webpicture/' + m[1] + '/thum2/' + m[2] + '/' : '';
							var comment = showLargePict.attr('title') || '';

							var dateAndLocation = $(this).find('p.thumbLocationAndDate').html().split('<br>');
							var date = dateAndLocation && dateAndLocation[0] || '';
							var location = dateAndLocation && dateAndLocation[1] || '';
							var fileName = date.replace(/(\/|:)/g, '').replace(' ', '-') + '_' + m[2] + '.jpg';

							images.push({
								imageUrl: imageUrl,
								thumbnailUrl: thumbnailUrl,
								fileName: fileName,
								date: date,
								location: location,
								comment: comment
							});
						});

					}).done(function() {
						$('#bookmarklet-dump-images .newsBox h3').text('Now loading...: ' + (index + 1) + ' / ' + pageNum);
						d.resolve();

					}).fail(function() {
						$('#bookmarklet-dump-images').text('Error');
						d.reject();
					});
				}, 1000);
				return d.promise();
			};
		})(i));
	}

	// Registers function calls and invokes them.
	var dfd = $.Deferred();
	dfd.resolve();
	for (var i = 0; i < callbacks.length; i++) {
		dfd = dfd.pipe(callbacks[i]);
	}
	dfd = dfd.done(function() {
		// Makes a CSV data.
		var keys = ['fileName', 'date', 'location', 'comment'];
		var csv = '\uFEFF';	// BOM for Microsoft Excel
		csv += 'ファイル名,日付,場所,コメント\n';
		for (var i = 0; i < images.length; i++) {
			for (var j = 0; j < keys.length; j++) {
				var value = images[i][keys[j]];
				if (value.search(/[\"\r\n,]/) >= 0) {
					value = '"' + value.replace('"', '""') + '"';
				}
				csv += value + ((j < keys.length - 1) ? ',' : '\n');
			}
		}

		// Makes the base of the filename.
		var d = new Date();
		var fileName = 'images_' + charId + '_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);

		// Makes the content.
		$('#bookmarklet-dump-images').empty()
			.append('<div class="newsBox"><h2 class="tit_note tit_icon">DQXアルバム画像一括保存ブックマークレット</h2>' +
					'<h3 class="tit_compass">注意</h3>' +
					'<ul style="padding: 0 16px 16px 32px; list-style-type: disc; font-size: 125%;">' +
					'<li>本ブックマークレットでは、複数の画像ファイルを一度にダウンロードするため、ブラウザにかなりの負荷がかかります。</li>' +
					'<li>本ブックマークレットの内部動作は、選択されたすべての画像に対して順番に[写真をダウンロード]ボタンを押しているのとほぼ等価です。そのため、ブラウザにもよりますが<strong>ファイル保存ダイアログが最大100枚表示され、それらに対して[保存]ボタンを押す必要があります</strong>。</li>' +
					'<li>ブラウザによっては、「ポップアップウィンドウの許可」や「複数ファイルのダウンロードの許可」をする必要があります。</li>' +
					'<li>ブラウザによっては、一度にダウンロードできるファイル数に上限があり、一回で全部の画像をダウンロードできない場合があります。その場合、チェックボックスで保存する画像ファイルを指定して、何回かに分けてダウンロードするようにしてください。' +
					'</ul></div>' +
					'<hr class="lineType2" />' +
					'<h2>アルバム画像一覧</h2>' +
					'<ul id="myImages" style="margin: 1em 0;"></ul>' +
					'<button id="myDownloadAll">チェックした画像をダウンロード</button>' +
					'<hr class="lineType2" style="clear: both;" />' +
					'<h2>アルバム画像情報</h2>' +
					'<textarea id="myCsv" readonly="readonly" style="width: 100%; height: 10em;">' + csv + '</textarea>');

		// thumbnails and checkboxes
		for (var i = 0; i < images.length; i++) {
			if (i % 10 === 0) {
				$('#myImages').append('<li style="clear: both;"><input type="checkbox" class="myGroupCheckboxes" style="float: left; margin-top: 2px;" /><ul class="myGroups" style="padding-left: 32px;"></ul></li>');
			}
			$('#myImages > li > ul:last').append('<li style="float: left; width: 50px; margin: 2px;"><input type="checkbox" class="myImageCheckboxes" style="position: absolute; border: none; padding: 0;" /><a href="' + images[i].imageUrl + '" target="_blank"><img src="' + images[i].thumbnailUrl + '" style="width: 100%;" /></a></li>');
		}
		$('#myImages').append('<ul style="clear: both;"></ul>');

		// download link
		if ($.browser.msie) {
			$('#bookmarklet-dump-images').append('<iframe id="myDummy" style="visibility: hidden; width: 0; height: 0;"></iframe>').parent()
				.find('#myCsv').after('<p><a href="#" onclick="var d = self.myDummy.document; d.open(); d.write(self.myCsv.value); d.close(); d.execCommand(&quot;SaveAs&quot;, true, &quot;' + fileName + '.csv&quot;); return false;"><span>アルバム画像情報ダウンロード(' + fileName + '.csv)</span></a></p>');
		} else {
			$('#bookmarklet-dump-images').find('#myCsv').after('<p class="btn_square"><a download = "' + fileName + '.csv" href="data:application/octet-stream,' + encodeURIComponent(csv) + '"><span>アルバム画像情報ダウンロード(' + fileName + '.csv)</span></a></p>');
		}

		// checkboxes to check images in a row
		$('input:checkbox.myGroupCheckboxes').change(function() {
			var checked = $(this).is(':checked');
			$(this).parents('li').find('input:checkbox.myImageCheckboxes').prop('checked', checked);
		});

		// checkboxes to choose to save
		$('input:checkbox.myImageCheckboxes').change(function() {
			var flagAnd = true;
			var flagOr  = false;
			$(this).parents('ul.myGroups').find('input:checkbox.myImageCheckboxes').each(function() {
				var checked = $(this).is(':checked');
				flagOr  |= checked;
				flagAnd &= checked;
			});

			var checkbox = $(this).parents('ul.myGroups').parents('li').find('input:checkbox.myGroupCheckboxes');
			if (flagAnd) {
				checkbox.prop('checked', true);
			}
			if (!flagOr) {
				checkbox.prop('checked', false);
			}
		});

		// download button
		$('#myDownloadAll').click(function() {
			// Makes an array of the links.
			var links = [];
			$('input:checkbox.myImageCheckboxes:checked').each(function() {
				links.push($(this).siblings('a')[0]);
			});

			// Checks whether at least one image is chosen.
			if (links.length === 0) {
				alert('画像が一枚も選択されていません。');
				return;
			}

			// Confirms whether really begin the process.
			if (!window.confirm('選択した' + links.length + '枚の画像の保存を開始します。よろしいですか?')) {
				return;
			}

			// Throws the click events to each link repeatedly.
			for (var i = 0; i < links.length; i++) {
				/* jshint loopfunc: true */
				(function(index, link) {
					setTimeout(function() {
						var e = document.createEvent('MouseEvents');
						e.initEvent('click', true, true);
						link.dispatchEvent(e);
					}, 1000 * i);
				})(i, links[i]);
			}
		});

		// Checks all the images from the beginning.
		$('input:checkbox.myGroupCheckboxes').prop('checked', true).change();
	});
})();
