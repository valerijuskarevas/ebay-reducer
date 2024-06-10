

import Reporter from '../helpers/Reporter.js';
import Auth from '../modules/Auth.js';
import fs from 'fs';
const auth = new Auth()

export default class Items {

  async getAllItems(pageSize = 1000) {
    const auth = new Auth()

    let respItems = []
    const pageCount = pageSize < 200 ? 1 : parseInt(pageSize / 200)
    for (let page = 1; page <= pageCount; page++) {

      var xmlBodyStr = `
      <?xml version="1.0" encoding="utf-8"?>
      <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <ActiveList>
      <Sort>TimeLeft</Sort>
          <Pagination> 
          <EntriesPerPage>${pageSize <= 200 ? pageSize : 200}</EntriesPerPage> 
          <PageNumber>${page}</PageNumber>
          </Pagination> 
      </ActiveList>
      </GetMyeBaySellingRequest>
    `

      const resp = await auth.callEbayApi("GetMyeBaySelling", xmlBodyStr)


      const data = resp['GetMyeBaySellingResponse']['ActiveList']
      // Check errors or pagination end
      if (resp && resp['GetMyeBaySellingResponse']['Errors']) {
        const error = resp['GetMyeBaySellingResponse']['Errors']['LongMessage']._text.replaceAll(' ', '^ ')
        throw new Error(error)
      } else if (!data) {
        break
      }

      const items = Array.isArray(data.ItemArray.Item) ? data.ItemArray.Item : [data.ItemArray.Item]
      respItems = [...respItems, ...items]
    }

    const activeItems = respItems.filter((i) =>
      (i.SKU === undefined || (i.SKU._text && i.SKU._text.trim() === ''))
      && (i.QuantityAvailable._text == 1)
    )

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

    let itemsToReduceCount = 0
    const itemsToReduce = []

    for (const item of items) {
      const needsReduction = this.checkIfNeedsReduction(item.itemId)
      if (needsReduction) {
        itemsToReduce.push(item)
        itemsToReduceCount++
      }
    }

    console.log('Total without SKU: ' + items.length)
    console.log('Needs reduction: ' + itemsToReduce.length + '\n')

    reporter.reductionReset()

    let count = 0
    let reducedCount = 0
    for (const item of itemsToReduce) {
      let itemId = item.itemId
      count++
      console.log(`Reducing ${count} of ${itemsToReduce.length}`)

      const title = item.title
      const originalPrice = parseFloat(item.price.amount).toFixed(2)
      const newPrice = parseFloat(originalPrice - discount).toFixed(2)
      const xmlBodyStr = `    <?xml version="1.0" encoding="utf-8"?>
            <ReviseInventoryStatusRequest xmlns="urn:ebay:apis:eBLBaseComponents">
              <InventoryStatus> InventoryStatusType
                <ItemID>${itemId}</ItemID>
                <StartPrice>${newPrice}</StartPrice>
              </InventoryStatus>
            </ReviseInventoryStatusRequest>`;

      // Check error
      const ebayResp = await auth.callEbayApi("ReviseInventoryStatus", xmlBodyStr)
      if (ebayResp && ebayResp['ReviseInventoryStatusResponse']['Errors']) {
        const error = ebayResp['ReviseInventoryStatusResponse']['Errors']['LongMessage']._text.replaceAll(' ', '^ ')
        reporter.logError(error)

        console.log(`${title} (${ebayResp['ReviseInventoryStatusResponse']['Errors']['ShortMessage']._text.replaceAll(' ', '^ ')})`)
        continue
      }

      const reductionDateTime = new Date().toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' }).replace(' ', 'T')
      const resp = {
        itemId,
        title,
        originalPrice,
        newPrice,
        reductionDateTime
      }
      console.log(`${title} (${originalPrice} -> ${newPrice})`)
      reporter.reductionJson(resp)
      reducedCount++
    }
    console.log(`\nReduced listings: ${reducedCount} of ${itemsToReduce.length}`)
    reporter.reductionLog()
  }

  async checkTotals() {
    const items = await this.getAllItems()
    let reductionLength = 0
    for (const item of items) {
      const itemId = item.itemId
      const needsReduction = this.checkIfNeedsReduction(itemId)
      if (!needsReduction) {
        continue
      }
      reductionLength++
    }
    if (reductionLength === 0) {
      console.log("SUCCESS")
    } else {
      console.log("FAILURE")
    }
  }

  checkIfNeedsReduction(itemId) {
    const secondsToDay = (24 * 60 * 60 * 1000)
    const auth = new Auth()
    const { fileName, confFile } = auth.getConfigFile()
    const reductionLogFileName = `reductionLog.json`

    let log
    try {
      log = JSON.parse(fs.readFileSync(reductionLogFileName).toString())
    } catch (e) {
      if ((!fs.existsSync(reductionLogFileName))) {
        fs.writeFileSync(reductionLogFileName, '[]', { recursive: true })
      }
      log = []
    }

    const item = log.filter((i) => i.itemId == itemId)[0]
    if (!item) {
      return true
    }

    let reductionTime = new Date(item.reductionDateTime)
    reductionTime.setMinutes(0)
    reductionTime.setSeconds(0)
    reductionTime = reductionTime.getTime()

    const currentTime = new Date().getTime()

    let daysSinceLastReduction = (currentTime - reductionTime) / secondsToDay;

    if (daysSinceLastReduction > confFile.invervalDays) {
      return true
    }
    // console.log(`${itemId} has been reduced in the last ${confFile.invervalDays} days`)
    return false
  }
}
