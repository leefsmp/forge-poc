
import ClientAPI from 'ClientAPI'
import BaseSvc from './BaseSvc'

export default class ModelSvc extends BaseSvc {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (opts) {
    super (opts)
    this.api = new ClientAPI(this._config.apiUrl)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get name() {
    return 'ModelSvc'
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getCount (dbName, opts = {}) {

    const url = `${dbName}/count`

    const query = `?search=${opts.search || ''}`

    return this.api.ajax (url + query)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getModels (dbName, opts = {}) {

    const url = dbName

    const query =
      `?limit=${opts.limit || 100}` +
      `&offset=${opts.offset || 0}` +
      `&search=${opts.search || ''}`+
      `&sort=${opts.sort || 'name'}`+
      `&sortOrder=${opts.sortOrder || 1}`

    return this.api.ajax (url + query)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getRecentModels (dbName) {

    const url = `/${dbName}/recents`

    return this.api.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getModel (dbName, modelId) {

    let publicUrl = process.env.PUBLIC_URL

    const NumberInt = (i) => parseInt(i)

    const models = { 
      1: {
      "model": {
        "path" : `${publicUrl}/models/car/model.svf`
      }, 
      "extensions" : [
        {
            "id" : "Viewing.Extension.ExtensionManager", 
            "options" : {
                "useStorage" : true, 
                "extensions" : [
                    {
                        "id" : "Viewing.Extension.PointCloudMarkup", 
                        "displayName" : "PointCloud Markup", 
                        "enabled" : true, 
                        "options" : {
                            "displayIndex" : 1, 
                            "pointCloudMarkup" : {
                                "selectionDistThreshold" : (20), 
                                "selectionRayThreshold" : NumberInt(20), 
                                "occlusionDist" : 10.0, 
                                "animation" : true, 
                                "active" : true
                            }, 
                            "readonly" : false
                        }
                    },
                    {
                      "id" : "Viewing.Extension.ModelTransformer", 
                      "displayName" : "Model Transforms", 
                      "enabled" : true, 
                      "options" : {
                          "displayIndex" : NumberInt(2)
                      }
                    }, 
                    {
                        "id" : "Viewing.Extension.ConfigManager", 
                        "displayName" : "Config Manager", 
                        "enabled" : true, 
                        "options" : {
                            "displayIndex" : NumberInt(3), 
                            "apiUrl" : "/api/config", 
                            "readonly" : false, 
                            "docked" : true
                        }
                    }
                ]
            }
        }
      ]},
      2: {
        "model": {
          "path" : `${publicUrl}/models/office/Resource/3D_View/3D/model.svf`
        }, 
        "extensions" : [
          {
              "id" : "Viewing.Extension.ExtensionManager", 
              "options" : {
                  "useStorage" : true, 
                  "visible" : true,
                  "extensions" : [
                      {
                          "id" : "Viewing.Extension.PointCloudMarkup", 
                          "displayName" : "PointCloud Markup", 
                          visible: true,
                          "options" : {
                              "pointCloudMarkup" : {
                                  "selectionDistThreshold" : NumberInt(20), 
                                  "selectionRayThreshold" : NumberInt(20), 
                                  "occlusionDist" : 10.0, 
                                  "animation" : true, 
                                  "active" : true
                              }, 
                              "readonly" : false
                          }
                      }, 
                      {
                        "id" : "Viewing.Extension.ModelTransformer", 
                        "displayName" : "Model Transforms", 
                        visible: true,
                        "options" : {
                        }
                      }, 
                      {
                          "id" : "Viewing.Extension.ConfigManager", 
                          "displayName" : "Config Manager", 
                          visible: true,
                          "options" : {
                              "apiUrl" : "/api/config", 
                              "readonly" : false, 
                              "docked" : true
                          }
                      },
                      {
                        "id" : "Viewing.Extension.ViewableSelector", 
                        "displayName" : "View Selector", 
                        visible: true,
                        "options" : {
                           
                        }
                      },
                      {
                        "id" : "Viewing.Extension.DualViewer", 
                        "displayName" : "Dual Viewer", 
                        enabled: true,
                        visible: true,
                        "options" : {
                          items: [{
                            name: 'Basement & Ground Floor',
                            path: `${publicUrl}/models/office/4df86081-3d3b-4c35-fbdd-234af5d7f5c7_f2d/primaryGraphics.f2d`
                          }, {
                            name: 'Plumbing Details',
                            path: `${publicUrl}/models/office/93f583fd-001d-6fb0-13ac-4301b0fc02b7_f2d/primaryGraphics.f2d`
                          }, { 
                            name: 'Terrace & Roof',
                            path: `${publicUrl}/models/office/062bdb73-fda2-4b97-76e2-4127142a26c3_f2d/primaryGraphics.f2d`
                          }, {
                            name: '1st & 2nd Floor',
                            path: `${publicUrl}/models/office/020360db-5f21-d5f0-2d01-af91604871d5_f2d/primaryGraphics.f2d`
                          }
                          ]
                        }
                    }, 
                    {
                        "id" : "Viewing.Extension.BarChart", 
                        "displayName" : "Bar Chart", 
                        "enabled" : true, 
                        visible: true,
                        "options" : {
                            "defaultIndex" : 7.0, 
                            "chartProperties" : [
                                "Category", 
                                "Flow", 
                                "Level", 
                                "Material", 
                                "Reference Level", 
                                "System Classification", 
                                "System Name", 
                                "System Type"
                            ]
                        }
                    }, 
                    {
                        "id" : "Viewing.Extension.PieChart", 
                        "displayName" : "Pie Chart", 
                        visible: true,
                        "options" : {
                            "fitToView" : true, 
                            "defaultIndex" : 0.0, 
                            "chartProperties" : [
                                "Category", 
                                "Flow", 
                                "Level", 
                                "Material", 
                                "Reference Level", 
                                "System Classification", 
                                "System Name", 
                                "System Type"
                            ]
                        }
                    } 
                  ]
              }
          }
        ]},
      3: {
        model: {
        "path" : `${publicUrl}/models/car/model.svf`
      }, 
      "extensions" : [
        {
            "id" : "Viewing.Extension.ExtensionManager", 
            "options" : {
                "useStorage" : true, 
                "extensions" : [
                    {
                        "id" : "Viewing.Extension.PointCloudMarkup", 
                        "displayName" : "PointCloud Markup", 
                        "enabled" : true, 
                        "options" : {
                            "displayIndex" : 1, 
                            "pointCloudMarkup" : {
                                "selectionDistThreshold" : (20), 
                                "selectionRayThreshold" : NumberInt(20), 
                                "occlusionDist" : 10.0, 
                                "animation" : true, 
                                "active" : false
                            }, 
                            "readonly" : true
                        }
                    }, 
                    {
                      "id" : "Viewing.Extension.ModelTransformer", 
                      "displayName" : "Model Transforms", 
                      "enabled" : true, 
                      "options" : {
                        "readonly" : true
                      }
                    }, 
                    {
                        "id" : "Viewing.Extension.ConfigManager", 
                        "displayName" : "Config Manager", 
                        "enabled" : true, 
                        "options" : {
                            
                            "apiUrl" : "/api/config", 
                            "readonly" : true, 
                            "docked" : false
                        }
                    }
                ]
            }
        }
      ]}
    }

    return Promise.resolve(models[modelId])    
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getModelByLink (dbName, linkId) {

    const url = `/${dbName}/links/${linkId}`

    return this.api.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addShareLink (dbName, modelId, link) {

    const url = `/${dbName}/${modelId}/links`

    return this.api.ajax({
      url,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(link)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteShareLink (dbName, modelId, linkId) {

    const url = `/${dbName}/${modelId}/links/${linkId}`

    return this.api.ajax({
      url,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getThumbnailUrl (dbName, modelId, size = 200) {

    const url = this.api.apiUrl +
      `/${dbName}/${modelId}/thumbnail` +
      `?size=${size}`

    return url
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  uploadW (file, opts = {}) {

    const url = '/worker'

    const options = Object.assign({}, {
      tag: 'model'
    }, opts)

    return this.api.upload (url, file, options)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteModel (dbName, modelId) {

    const url = `/${dbName}/${modelId}`

    return this.api.ajax({
      url: url,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }
}
