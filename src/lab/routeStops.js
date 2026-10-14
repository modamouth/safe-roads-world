// @ts-check
/** @typedef {{id:string,label:string,x:number,y:number,type:'town'|'rest'|'fuel'}} RouteStop */
// Positions measured on the supplied schematic, not geographic coordinates.
/** @type {readonly RouteStop[]} */
export const B1_ROUTE_STOPS = [
  { id: 'whk', label: 'Windhoek', x: .32, y: .96, type: 'town' },
  { id: 'oka', label: 'Okahandja', x: .3716, y: .8496, type: 'town' },
  { id: 'rest1', label: 'Rest stop', x: .5052, y: .7208, type: 'rest' },
  { id: 'otj', label: 'Otjiwarongo', x: .546, y: .6104, type: 'town' },
  { id: 'fuel', label: 'Fuel stop', x: .4886, y: .4816, type: 'fuel' },
  { id: 'tsu', label: 'Tsumeb', x: .408, y: .3712, type: 'town' },
  { id: 'osh', label: 'Oshakati', x: .59, y: .0768, type: 'town' }
];
