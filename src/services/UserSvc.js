
import ClientAPI from 'ClientAPI'
import BaseSvc from './BaseSvc'

export default class UserSvc extends BaseSvc {

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  constructor (config) {

    super (config)

    this.api = new ClientAPI(config.apiUrl)

    this.baseUserUrl = ''
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  get name() {
    return 'UserSvc'
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  async ffLogin (credentials) {

    this.baseUserUrl = 'ff'

    const url = `/auth/${this.baseUserUrl}/login`

    const res = await this.api.ajax({
      data: JSON.stringify(credentials),
      contentType: 'application/json',
      dataType: 'json',
      type: 'POST',
      url
    })

    this.emit('user.login')

    return res
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  async forgeLogin () {

    this.baseUserUrl = 'forge'

    const url = await this.getForgeLoginURL()

    window.location.assign(url)
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  async logout () {

    const url = `/auth/${this.baseUserUrl}/logout`

    const res = await this.api.ajax({
      contentType: 'application/json',
      dataType: 'json',
      type: 'POST',
      url
    })

    this.emit('user.logout')

    return res
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  async getUser () {

    const user = await this.api.ajax('/user')

    this.baseUserUrl = user.type

    return user
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  async getForgeLoginURL () {

    const url = '/auth/forge/login'

    const payload = {
      origin: window.location.href
    }

    this.loginURL = await this.api.ajax({
      contentType: 'application/json',
      data: JSON.stringify(payload),
      dataType: 'json',
      type: 'POST',
      url
    })

    return this.loginURL
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  get clientId() {
    return new Promise((resolve) => {
      if (this._forgeClientId) {
        return resolve (this._forgeClientId)
      }
      this.api.ajax('/auth/forge/clientId').then((res) => {
        this._forgeClientId = res.clientId
        resolve (this._forgeClientId)
      })
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getActiveModels (db) {

    const url = `/user/${db}/models`

    return this.api.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async getPermissionsOnModel (db, modelId) {

    try {

      const url = `/user/${db}/permissions/${modelId}`

      const permissions = await this.api.ajax(url)

      return permissions

    } catch {

      return []
    }
  }
}
