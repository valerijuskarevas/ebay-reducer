

import Reporter from '../helpers/Reporter.js';
import Auth from '../modules/Auth.js';
const auth = new Auth()

export default class Items {

  async getAllItems(pageSize = 1000) {
    const auth = new Auth()

    // 100 days
    var dateOffset = (24 * 60 * 60 * 1000) * 100; //5 days
    var startDate = new Date();
    startDate.setTime(startDate.getTime() - dateOffset);

    let respItems = []
    const pageCount = pageSize < 200 ? 1 : parseInt(pageSize / 200)
    for (let page = 1; page <= pageCount; page++) {
      var xmlBodyStr = `<?xml version="1.0" encoding="utf-8"?>
        <GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">    
            <ErrorLanguage>en_US</ErrorLanguage>
            <WarningLevel>High</WarningLevel>
             <!--You can use DetailLevel or GranularityLevel in a request, but not both-->
          <GranularityLevel>Coarse</GranularityLevel> 
             <!-- Enter a valid Time range to get the Items listed using this format
                  2013-03-21T06:38:48.420Z -->
          <StartTimeFrom>${startDate.toISOString()}</StartTimeFrom> 
          <StartTimeTo>${new Date().toISOString()}</StartTimeTo> 
          <IncludeWatchCount>true</IncludeWatchCount> 
          <Pagination> 
            <EntriesPerPage>${pageSize <= 200 ? pageSize : 200}</EntriesPerPage> 
            <PageNumber>${page}</PageNumber>
          </Pagination> 
        </GetSellerListRequest>`;

      const resp = await auth.callEbayApi("GetSellerList", xmlBodyStr)
      const data = resp['GetSellerListResponse']
      if (data && data['Errors']) {
        if (data['Errors'].ErrorCode._text == 340) {
          break
        }
        const error = data['Errors']['LongMessage']._text.replaceAll(' ', '^ ')
        throw new Error(error)
      }
      const items = Array.isArray(data.ItemArray.Item) ? data.ItemArray.Item : [data.ItemArray.Item]
      respItems = [...respItems, ...items]
    }

    const activeItems = respItems.filter((i) => {
      const ignore = i.SKU && i.SKU._text && i.SKU._text !== ''
      return !ignore && i.SellingStatus.ListingStatus._text === "Active"
    })

    return activeItems.map((i) => {
      return {
        title: i.Title._text,
        itemId: i.ItemID._text,
        price: {
          amount: parseFloat(i.SellingStatus.CurrentPrice._text),
          currency: i.SellingStatus.CurrentPrice._attributes.currencyID
        }
      }
    })
  }

  async setNewItemPrice(itemId, originalPrice, discount) {
    var xmlBodyStr = `    <?xml version="1.0" encoding="utf-8"?>
        <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <InventoryStatus> InventoryStatusType
            <ItemID>${itemId}</ItemID>
            <StartPrice>${originalPrice - discount}</StartPrice>
          </InventoryStatus>
        </ReviseInventoryStatusRequest>`;
    return JSON.parse(await auth.callEbayApi("ReviseInventoryStatus", xmlBodyStr))
  }

  async bulkDiscount(discount) {
    const items = await this.getAllItems()
    const reporter = new Reporter()
    console.log('Starting reduction')
    reporter.reductionReset()
    for (const item of items) {
      const itemId = item.itemId
      const title = item.title
      const originalPrice = parseFloat(item.price.amount).toFixed(2)
      const newPrice = parseFloat(originalPrice - discount).toFixed(2)
      var xmlBodyStr = `    <?xml version="1.0" encoding="utf-8"?>
            <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <InventoryStatus> InventoryStatusType
                <ItemID>${itemId}</ItemID>
                <StartPrice>${newPrice}</StartPrice>
              </InventoryStatus>
            </ReviseInventoryStatusRequest>`;
      await auth.callEbayApi("ReviseInventoryStatus", xmlBodyStr)
      const resp = {
        itemId,
        title,
        originalPrice,
        newPrice
      }
      reporter.reductionLog(resp)
      console.log(resp)
    }
  }
}
