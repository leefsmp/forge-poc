
export const ITEM_REMOVED = 'cart/ITEM_REMOVED'
export const ITEM_ADDED = 'cart/ITEM_ADDED'

const initialState = {
  totalCost: 0.0,
  itemsMap: {}
}

const getCartItem = (state, itemId, item) => {
  return state.itemsMap[itemId] || {
    unitPrice: item.unitPrice,
    discount: item.discount,
    name: item.name,
    quantity: 0,
    id: itemId,
    price: 0.0
  }
}

const computePriceWithDiscount = (cartItem, quantity) => {

  if (cartItem.discount) {
    const nb = Math.floor(quantity/cartItem.discount)
    return cartItem.unitPrice * (quantity - nb)
  }

  return cartItem.unitPrice * quantity
}

const addCartItem = (cartItem) => {
  const quantity = cartItem.quantity + 1
  const price = computePriceWithDiscount(
    cartItem, quantity)
  return {
    ...cartItem, 
    quantity,
    price
  }
}

const removeCartItem = (cartItem) => {
  const quantity = cartItem.quantity - 1
  const price = computePriceWithDiscount(
    cartItem, quantity)
  return {
    ...cartItem,
    quantity,
    price
  }
}

const computeCost = (itemsMap) => {
  return Math.round(100 *
    Object.values(itemsMap).reduce((cost, entry) => {
      return cost + entry.price
    }, 0.0)) / 100
}

export default (state = initialState, action) => {

  switch (action.type) {
  
    case ITEM_ADDED: {

      const {item} = action
      
      const cartItem = getCartItem(state, item.id, item)  
      
      const itemsMap = {
        ...state.itemsMap,
        [item.id]: addCartItem(cartItem)
      }
      
      const totalCost = computeCost(itemsMap)
      
      return {
        ...state,
        itemsMap,
        totalCost
      }
    }

    case ITEM_REMOVED: {
      
      const {itemId} = action
      
      const cartItem = getCartItem(state, itemId)
      
      const entry = removeCartItem(cartItem)
      
      const itemsMap = {
        ...state.itemsMap,
        [itemId]: entry
      }
      
      if (entry.quantity === 0) {
        delete itemsMap[itemId]
      }
      
      const totalCost = computeCost(itemsMap)

      return {
        ...state,
        itemsMap,
        totalCost
      }
    }

    default:
      return state
  }
}

export const addToCart = (item) => {
  return dispatch => {
    dispatch({
      type: ITEM_ADDED,
      item
    })
  }
}

export const removeFromCart = (itemId) => {
  return dispatch => {
    dispatch({
      type: ITEM_REMOVED,
      itemId
    })
  }
}