/* --------------------------------------------------------------
Looks Rare Collection Widget for https://scriptable.app by OddJobBodGod
Script: LooksRareCollection.js
Author: OddJobBodGod
Version: 1.0.0
-------------------------------------------------------------- */

let looksRareConfig = args.widgetParameter || '{"collection": "0x7dDAA898D33D7aB252Ea5F89f96717c47B2fEE6e"}'
let configurationElements = JSON.parse(looksRareConfig);

function collectionURL(collectionId) {
  return `https://looksrare.org/collections/${collectionId}`
}

function tokenURL(collectionId, tokenId) {
  return `https://looksrare.org/collections/${collectionId}/${tokenId}`
}

function formatNumberString(number, decimals=2) {
  let numberReturn = parseFloat(number);
  let decimal = numberReturn / 1000000000000000000
  let isWholeNumber = decimal % 1 == 0
  return `${(decimal).toFixed(isWholeNumber ? 0 : decimals)}`;
}

function sfSymbol(name, font) {
  let symbol = SFSymbol.named(name)
  symbol.applyFont(font)
  return symbol.image
}

async function addAvatar(url, stack) {
  let imageRequest = new Request(url)
  let imageData = await imageRequest.loadImage()
  let image = stack.addImage(imageData)
  image.imageSize = new Size(28, 28)
  image.cornerRadius = 14
  image.borderWidth = 1
  image.borderColor = Color.white()
  image.applyFillingContentMode()
}

async function addHeader(name, imageUrl, stack, isVerified = false, collectionId, widgetFamily = 'small') {

  let headerStack = stack.addStack()
  headerStack.url = collectionURL(collectionId)
  headerStack.centerAlignContent()

  if (!!imageUrl) {
    addAvatar(imageUrl, headerStack)
  }

  let titleText = headerStack.addText(name)
  titleText.textColor = Color.white()
  titleText.font = Font.boldSystemFont(16)
  
  if (isVerified && widgetFamily != 'small') {
    headerStack.addSpacer(6)
    let tickSymbol = sfSymbol('checkmark.seal.fill', Font.boldSystemFont(32))
    let tickImage = headerStack.addImage(tickSymbol)
    tickImage.imageSize = new Size(18, 18)
    tickImage.tintColor = new Color('#5587F8')
     
  }
}

function addValueStack(value, label, percentageChange, stack, unit = 'Ξ') {

  let valueStack = stack.addStack()
  valueStack.layoutVertically()

  let amountStack = valueStack.addStack()
  amountStack.bottomAlignContent()

  let numberString = typeof value === 'number' ? `${value}` : formatNumberString(value)

  let valueText = amountStack.addText(`${!!unit ? `${unit} ` : ""}${numberString}`)
  valueText.textColor = Color.white()
  valueText.font = Font.boldSystemFont(16)

  amountStack.addSpacer()

  if (!!percentageChange) {
    let symbol = sfSymbol(percentageChange > 0 ? 'arrow.up' : 'arrow.down', Font.systemFont(14))
    let widgetImage = amountStack.addImage(symbol)
    widgetImage.imageSize = new Size(14, 14)
    widgetImage.tintColor = percentageChange > 0 ? new Color('#6FDF7B') : new Color('#E15C5E')
    amountStack.addSpacer(2)
    let percentText = amountStack.addText(`${percentageChange.toFixed(2)}%`)
    percentText.font = Font.systemFont(12)
  }
  
  let labelText = valueStack.addText(label)
  labelText.textColor = new Color('#fff', 0.8)
  labelText.font = Font.systemFont(12)
}

async function addListings(collection, stack, widgetFamily = 'small') {
  
  for (const token of collection.tokens) {

    let tokenStack = stack.addStack()
    tokenStack.centerAlignContent()

    if (!!token.collection && !!token.collection.address && !!token.tokenId) {
      tokenStack.url = tokenURL(token.collection.address, token.tokenId)
    }

    if (
      !!token.image && 
      !!token.image.src && 
      token.image.contentType && 
      token.image.contentType.startsWith("image")
    ) {
      await addAvatar(token.image.src, tokenStack)
      tokenStack.addSpacer(6)
    }

    let valuesStack, nameStack

    if (widgetFamily === 'large') {
      valuesStack = tokenStack
      nameStack = tokenStack
    } else {
      nameValueStack = tokenStack.addStack()
      nameStack = nameValueStack
      nameValueStack.layoutVertically()
    }

    let nameText = nameStack.addText(token.name)
    nameText.textColor = Color.white()
    nameText.font = Font.systemFont(12)

    if (widgetFamily === 'large') {
      tokenStack.addSpacer()
    }

    if (widgetFamily === 'medium') {
      valuesStack = nameStack.addStack()
    }

    if (!!token.ask && !!token.ask.amount) {
      let askText = valuesStack.addText(`Ξ ${formatNumberString(token.ask.price)}`)
      askText.textColor = Color.white()
      askText.font = Font.boldSystemFont(12)
    }

    if (!!token.bids && token.bids.length != 0 && !!token.bids[0].price) {
      valuesStack.addSpacer(8)
      let priceText = valuesStack.addText(`Ξ ${formatNumberString(token.bids[0].price)}`)
      priceText.textColor = Color.white()
      priceText.font = Font.boldSystemFont(12)
    }

    stack.addSpacer(8)
  }
}

async function createWidget(widgetFamily = 'small') {
	
  const collectionId = configurationElements.collection
  const api = new LooksRareAPI()
  const collection = await api.loadCollectionTokens(collectionId, widgetFamily === 'large' ? 5 : 3)
  const collectionStats = await api.loadCollectionStats(configurationElements.collection)
  
  let floor = null;
  let collectionName = "Failed to Load";
  let volume24hr = null;
  let volumeAll = collectionStats.volumeAll
  let isVerified = false
  
  if (!!collection && !!collection.tokens && collection.tokens.length > 0) {
    let firstToken = collection.tokens[0]
    const firstCollection = firstToken.collection
    collectionName = firstCollection.name;
   	floor = firstCollection.floor
    volume24hr = firstCollection.volume.volume24h  
    isVerified = firstCollection.isVerified
    console.log(JSON.stringify(firstToken.collection))
  } else {
    volume24hr = collectionStats.volume24h
  }
  
  const widget = new ListWidget()
  widget.backgroundColor = new Color('#121619')

  const mainStack = widget.addStack()
  mainStack.topAlignContent()
  // Spacer to top-align content
  widget.addSpacer()

  const contentStack = mainStack.addStack()
  contentStack.layoutVertically()
  
  // If we add here on medium it pushes title off top of widget due to showing 3 tokens
  if (widgetFamily !== 'medium') {
    // Can't get collection image yet because we don't have OpenSea API key and LooksRare seems
    // to get images from OpenSea API
    await addHeader(collectionName, /*collection.image_url*/ null, contentStack, isVerified, collectionId, widgetFamily)
    contentStack.addSpacer(8)
  }

  if (!!collection) {
    const splitStack = contentStack.addStack()
    if (widgetFamily === 'large') {
      splitStack.layoutVertically()
    } else {
      splitStack.topAlignContent()
    }

    const collectionValuesStack = splitStack.addStack()
    collectionValuesStack.layoutVertically()  
    collectionValuesStack.url = collectionURL(collectionId)

    if (widgetFamily === 'medium') {
      // Can't get collection image yet because we don't have OpenSea API key and LooksRare seems
      // to get images from OpenSea API
      await addHeader(collectionName, /*collection.image_url*/ null, collectionValuesStack, isVerified, collectionId, widgetFamily)
      collectionValuesStack.addSpacer(8)
    }

    let floorVolumeStack = collectionValuesStack
    let valuesContainerStack
    let shown24hrVol = false
    if (widgetFamily === 'large') {
      // Horizontal container for pairs of values
      valuesContainerStack = collectionValuesStack.addStack()
      floorVolumeStack = valuesContainerStack.addStack()
      floorVolumeStack.layoutVertically()
    }

    addValueStack(floor.floorPrice, 'Floor', floor.floorChange24h, floorVolumeStack)
    floorVolumeStack.addSpacer(8)
    if (!!volumeAll) {
      addValueStack(volumeAll, 'Volume', null, floorVolumeStack)
    } else {
      shown24hrVol = true
      addValueStack(volume24hr, '24hr Vol.', null, floorVolumeStack)
    }

    if (widgetFamily === 'large') {

      valuesContainerStack.addSpacer(16)
      let itemsOwnersStack = valuesContainerStack.addStack()
      itemsOwnersStack.layoutVertically()

      if (!!collectionStats.totalSupply) {
        addValueStack(collectionStats.totalSupply, 'Items', null, itemsOwnersStack, null)
      }

      itemsOwnersStack.addSpacer(8)

      if (!shown24hrVol) {
        addValueStack(volume24hr, '24hr Vol.', null, itemsOwnersStack)
      }
    }

    if (widgetFamily !== 'small') {
      splitStack.addSpacer(16)
      let listingsStack = splitStack.addStack()
      listingsStack.layoutVertically()
      await addListings(collection, listingsStack, widgetFamily)
    }
  }

  return widget
}

class LooksRareAPI {

  constructor() {
    this.baseURL = 'https://api.looksrare.org/api/v1/'
    this.graphURL = 'https://api.looksrare.org/graphql'
    this.baseHeaders = {
      'content-type': 'application/json'
    }
  }

  async performRequest(path, method = 'get', body = null, graph = false) {
    let request = new Request((graph ? this.graphURL : this.baseURL) + path);
    request.headers = this.baseHeaders
    request.method = method
    if (!!body && method !== 'get') {
      request.body = body
    }
    let json = await request.loadJSON()
    return json.data
  }

	async loadCollectionStats(collectionId) {
    return this.performRequest(`collections/stats?address=${collectionId}`)
  }

  async loadCollectionTokens(collectionId, items = 3) {
    return this.performRequest(
      '', 
      'post', 
      JSON.stringify({
        query: "\n    query GetTokens(\n      $filter: TokenFilterInput\n      $pagination: PaginationInput\n      $sort: TokenSortInput\n      $ownerFilter: TokenOwnerInput\n      $bidsFilter: OrderFilterInput\n    ) {\n      tokens(filter: $filter, pagination: $pagination, sort: $sort) {\n        ...TokensFragment\n        owners(filter: $ownerFilter) {\n      balance\n        }\n        ask {\n          ...OrderFragment\n        }\n        bids(filter: $bidsFilter, sort: PRICE_DESC, pagination: { first: 1 }) {\n          ...OrderFragment\n        }\n      }\n    }\n    \n  fragment TokensFragment on Token {\n    id\n    tokenId\n    image {\n      src\n      contentType\n    }\n    name\n    lastOrder {\n      price\n      currency\n    }\n    collection {\n      name\n      address\n      type\n      isVerified\n      points\n      totalSupply\n      floorOrder {\n        price\n      }\n      volume {\n        volume24h\n      }\n      floor {\n        floorPriceOS\n        floorPrice\n        floorChange24h\n      }\n    }\n  }\n\n    \n  fragment OrderFragment on Order {\n    isOrderAsk\n    signer\n    collection {\n      address\n    }\n    price\n    amount\n    strategy\n    currency\n    startTime\n    endTime\n    minPercentageToAsk\n    token {\n      tokenId\n    }\n  }\n\n",
        variables: {
          bidsFilter: {
            status: "VALID",
            startTime: 1650635326,
            endTime: 1650635326
          },
          filter: {
            collection: collectionId,
          },
          ownerFilter: {
            addresses: ['0x673B3017a96eEc31F27eAfA8c979c072e5351FbC']
          },
          pagination: {first: items},
          sort: "PRICE_ASC"
        }
      }),
      true
    )
  }
}

async function previewWidget() {
  let widget;
  let resp = await presentAlert('Preview Widget',
    ['Small','Medium','Large','Cancel'])
  switch (resp) {
    case 0:
      widget = await createWidget('small')
      await widget.presentSmall()
      break;
    case 1:
      widget = await createWidget('medium')
      await widget.presentMedium()
      break;
    case 2:
      widget = await createWidget('large')
      await widget.presentLarge()
      break;
    default:
  }
}

async function presentAlert(prompt,items,asSheet) 
{
  let alert = new Alert()
  alert.message = prompt
  
  for (const item of items) {
    alert.addAction(item)
  }
  let resp = asSheet ? 
    await alert.presentSheet() : 
    await alert.presentAlert()
  return resp
}

if (config.runsInWidget) {
  const widget = await createWidget(config.widgetFamily)
  Script.setWidget(widget)
  Script.complete()
} else {
  await previewWidget()
}