(async function () {
  "use strict";

  /**
   * 文字列を指定したファイル名でダウンロードする
   *
   * @param {string} filename
   * @param {string} text
   */
  function downloadText(filename, text) {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.download = filename;
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    a.click();
    a.remove();
  }

  /**
   * 思い出アルバムのキャラクターIDを取得する
   *
   * キャラクターIDが見つからないか、思い出アルバム画面に
   * なっていないときはnullを返す。
   *
   * @return {string|null} character ID
   */
  function getAlbumCharacterId() {
    // 思い出アルバムのURLからキャラクターIDを抜き出す正規表現
    const albumCharacterIdPattern =
      /^https:\/\/hiroba\.dqx\.jp\/sc\/character\/([0-9]+)\/picture/;
    // アドレスバーのURLとパターンマッチ
    const matches = window.location.href.match(albumCharacterIdPattern);
    if (!matches) {
      return null;
    }
    // 抜き出したキャラクターIDを返す([0]はパターンマッチした元の文字列)
    return matches[1];
  }

  /**
   * 写真詳細情報を保持するクラス
   *
   * @class PictureDetail
   */
  class PictureDetail {
    /**
     * @param {string} id 写真ID
     * @param {string} filename ファイル名
     * @param {string} date 撮影日時
     * @param {string} location 撮影場所
     * @param {string} comment コメント
     * @param {string} filter フィルター設定
     * @param {string} focus フォーカス設定
     * @param {string} frame フレーム設定
     * @memberof PictureDetail
     */
    constructor(id, filename, date, location, comment, filter, focus, frame) {
      this.id = id;
      this.filename = filename;
      this.date = date;
      this.location = location;
      this.comment = comment;
      this.filter = filter;
      this.focus = focus;
      this.frame = frame;
    }

    /**
     * 写真詳細情報を読んでくる
     *
     * @param {string} charId キャラクターID
     * @param {string} pictId 写真ID
     * @return {Promise<Response>} fetch関数のレスポンス
     */
    static _loadPictureDetail(charId, pictId) {
      const url = `/sc/character/${charId}/picture/detail/${pictId}?bp=0`;
      return fetch(url);
    }

    /**
     * 写真詳細情報を解析し、配列に各種情報を入れて返す
     *
     * @param {Response} response
     * @return {Promise<Array>} PictureDetailのidを除く引数
     */
    static async _parsePictureDetailResponse(response) {
      // DOM構文解析用意
      const parser = new DOMParser();
      // 取得した写真詳細情報をDOM構文解析
      const resDom = parser.parseFromString(await response.text(), "text/html");
      // 撮影日時と撮影場所を取得
      const [date, location] = resDom
        .getElementById("pictureDetailLocationAndDate")
        .innerHTML.split("<br>");
      // コメントを取得 コメントがない場合は要素そのものがない
      const comment =
        resDom.getElementById("pictureDetailComment")?.innerHTML || "";
      // 撮影設定情報の要素
      const photoSettings = resDom.getElementsByClassName(
        "photo-setting-item--value"
      );
      // 撮影情報の値を取得
      const [filter, focus, frame] = Array.from(photoSettings).map((e) => {
        const innerText = e.innerText.replace(/\n|\t|\s/g, "");
        const match = innerText.match(/.+?\:.+?/g);
        if (match) return match.join(" ");
        return innerText;
      });

      return [null, date, location, comment, filter, focus, frame];
    }

    /**
     * 写真の情報を取得する
     *
     * @param {string} charId キャラクターID
     * @param {string} pictId 写真ID
     * @return {Promise<PictureDetail>}
     */
    static async _createPictureDetail(charId, pictId) {
      const response = await this._loadPictureDetail(charId, pictId);
      const detail = await this._parsePictureDetailResponse(response);
      const pictureDetail = new PictureDetail(pictId, ...detail);

      // 公式と同じファイル名を日時と写真IDから生成
      const dateTime = pictureDetail.date
        .replace(/(\/|:)/g, "")
        .replace(" ", "-");
      const filename = `${dateTime}_${pictId}.jpg`;
      pictureDetail.filename = filename;

      return pictureDetail;
    }

    /**
     * PictureDetailをキャラクターIDと写真IDから作成
     *
     * @static
     * @param {string} charId
     * @param {string} pictId
     * @return {Promise<PictureDetail>}
     * @memberof PictureDetail
     */
    static create(charId, pictId) {
      return this._createPictureDetail(charId, pictId);
    }
  }

  /**
   * 写真詳細情報へのリンクから写真IDを取得する
   *
   * @param {Element} element showLargePictクラスを持つ要素(写真詳細情報へのリンクが含まれる要素)
   * @return {string} 写真ID
   */
  function parsePictureDetailUrlToPictureId(element) {
    // 2021年12月現在、showLargePictクラスを持つ要素の
    // rel属性に写真詳細情報へのリンクが貼られている
    return element.getAttribute("rel").match(/\/picture\/detail\/(\d+)/)[1];
  }

  /**
   * 思い出アルバムページ内にある写真すべてのIDを取得する
   *
   * @return {Array<string>} 写真IDの配列
   */
  function getPictureIds() {
    const showLargePicts = document.getElementsByClassName("showLargePict");
    return Array.from(showLargePicts).map(parsePictureDetailUrlToPictureId);
  }

  /**
   * 全ての写真情報を取得する
   *
   * @param {string} charId キャラクターID
   * @return {Promise<Array<PictureDetail>>}
   */
  async function getAllPictureDetails(charId) {
    let jobs = [];
    // 全画像の詳細情報にアクセス
    getPictureIds().forEach((pictId) => {
      jobs.push(PictureDetail.create(charId, pictId));
    });
    // ["597370827", "319062192", "213643319"].forEach((pictId) => {
    //   jobs.push(PictureDetail.create(charId, pictId));
    // });
    return await Promise.all(jobs);
  }

  // キャラクターIDを取得、思い出アルバムページ以外ではnullになる
  const charId = getAlbumCharacterId();
  // if (charId) {
  //   alert(
  //     "「冒険日誌」の「思い出アルバム」に移動してから、再度本ブックマークを実行してください。"
  //   );
  //   return;
  // }
  // 全写真詳細情報を取得
  let pictureDetails = await getAllPictureDetails(charId);

  // CSVダウンロードボタン追加
  $("#js-picture>.picture-download-navi>div:first-child").append(`
  <div>
    <div class="text-center mr10 ml10 mt20">
      思い出アルバム内の有効な写真の全ての詳細情報(ファイル名・撮影日時・撮影場所・コメント・フィルター設定・フォーカス設定・フレーム設定)をCSV形式でダウンロードします。写真とセットでダウンロードし、保管しておくことをおすすめします。
    </div>
    <a id="mangabuta-csv-download" class="img-button btn-picture-download-all-images cursor-pointer mra mla mt10">
      <img src="https://cdn.jsdelivr.net/gh/mangabuta/dump_images@master/download_all_image_data.png">
    </a>
  </div>`);

  // CSVダウンロードボタン押下時の処理
  $("#mangabuta-csv-download").click(async () => {
    //
    // 事前に取得した写真詳細情報からCSVデータを作成しダウンロードする
    //

    // カラム名
    const columnNames = [
      "ファイル名",
      "日付",
      "場所",
      "コメント",
      "フィルター設定",
      "フォーカス設定",
      "フレーム設定",
    ];
    // BOM for Microsoft Excel
    var csv = "\uFEFF";
    // テーブルヘッダ
    csv += `${columnNames.join(",")}\n`;
    // CSVに使用する順序で写真詳細情報を整理
    pictureDetails.sort((a, b) => Number(b.id) - Number(a.id));
    const rowitems = pictureDetails.map((pd) => {
      return [
        pd.filename,
        pd.date,
        pd.location,
        pd.comment,
        pd.filter,
        pd.focus,
        pd.frame,
      ];
    });

    // CSV向けにデータをサニタイジング
    for (var i = 0; i < rowitems.length; i++) {
      for (var j = 0; j < columnNames.length; j++) {
        var value = rowitems[i][j];
        if (value.search(/[\"\r\n,]/) >= 0) {
          value = '"' + value.replace('"', '""') + '"';
        }
        csv += value + (j < columnNames.length - 1 ? "," : "\n");
      }
    }

    // ファイル名の日時は旧ブックマークレットのダウンロード日時から1番新しい写真の日時に変更
    const dateTime = pictureDetails[0].date.replace(/\/|:|\s/g, "");

    // CSVをダウンロード
    downloadText(`images_${charId}_${dateTime}.csv`, csv);
  });
})();
