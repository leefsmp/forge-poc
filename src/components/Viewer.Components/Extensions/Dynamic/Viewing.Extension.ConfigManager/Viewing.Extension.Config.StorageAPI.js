////////////////////////////////////////////////////////////////
// ConfigManager API
//
/////////////////////////////////////////////////////////////////
import ServiceManager from 'SvcManager'
import sortBy from 'lodash/sortBy'

export default class ConfigStorageAPI {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (apiUrl) {

    this.apiUrl = apiUrl

    this.storageSvc = ServiceManager.getService('StorageSvc')
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getSequences (opts = {}) {

    return new Promise ((resolve) => {

      const url = `${this.apiUrl}/sequences`

      let sequences = this.storageSvc.load (url, [])

      if (opts.sortByName) {
        sequences = sortBy(sequences, (s) => s.name)
      }

      resolve(sequences)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addSequence (sequence) {

    return new Promise (async(resolve) => {

      const url = `${this.apiUrl}/sequences`

      const sequences = await this.getSequences()

      this.storageSvc.save (url, [
        ...sequences,
        sequence
      ])

      resolve()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  updateSequence (sequence) {

    return new Promise (async(resolve) => {

      const url = `${this.apiUrl}/sequences`

      const sequences = await this.getSequences()

      this.storageSvc.save (url, [
        ...sequences.filter(s => s.id !== sequence.id),
        sequence
      ])

      resolve(sequence)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteSequence (sequenceId) {

    return new Promise (async(resolve) => {

      const url = `${this.apiUrl}/sequences`

      const sequences = await this.getSequences()

      this.storageSvc.save (url, 
        sequences.filter(s => s.id !== sequenceId))

      resolve()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async getStates (sequenceId) {

    return new Promise ((resolve) => {

      const url = `${this.apiUrl}/sequences/${sequenceId}/states`

      const states = this.storageSvc.load (url, [])
      
      resolve(states)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addState (sequenceId, state) {

    return new Promise (async(resolve) => {

      const url = `${this.apiUrl}/sequences/${sequenceId}/states`
      
      const states = await this.getStates(sequenceId)

      this.storageSvc.save (url, [
        ...states,
        state
      ])
      
      resolve()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteState (sequenceId, stateId) {

    return new Promise (async(resolve) => {

      const url = `${this.apiUrl}/sequences/${sequenceId}/states`
      
      const states = await this.getStates(sequenceId)

      this.storageSvc.save (url, 
        states.filter(s => s.id !==stateId))
      
      resolve()
    })
  }
}
