import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { circle, geoJSON, latLng, Layer, MapOptions, tileLayer } from 'leaflet';

import { environment } from './../environments/environment';

import { zona } from './constants/zona.constants';
import { macrozona } from './constants/macrozona.constants';
import { corredores } from './constants/corredores.constants';
import { infiltracoes } from './constants/infiltracoes.constants';
import { trechos } from './constants/trechos.constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  mapOptions!: MapOptions;
  layers: Layer[] = [];
  layersControl: any;

  buffer: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.initializeMapOptions();

    this.initializeLayerControl();
  }

  private initializeMapOptions() {
    this.mapOptions = {
      center: latLng(-8.05, -34.93),
      zoom: 13,
      layers: [
        tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 18,
          attribution: 'Map data © OpenStreetMap contributors',
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }),
      ],
    };
  }

  private initializeLayerControl() {
    this.layersControl = {
      baseLayers: {
        'Google Maps': tileLayer(
          'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          {
            maxZoom: 18,
            attribution: 'Map data © OpenStreetMap contributors',
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          }
        ),
      },
      overlays: {
        Macrozona: geoJSON(macrozona as any, {
          style: () => ({ color: 'red', weight: 2 }),
        }).bindPopup(function (layer: any) {
          return layer.feature.properties.Layer;
        }),

        'Zona parque': geoJSON(zona as any, {
          style: () => ({ color: 'blue', weight: 2 }),
        }).bindPopup(function (layer: any) {
          return layer.feature.properties.Layer;
        }),

        Corredores: geoJSON(corredores as any, {
          style: () => ({ color: 'green', weight: 2 }),
        }).bindPopup(function (layer: any) {
          return layer.feature.properties.Layer;
        }),

        Infiltrações: geoJSON(infiltracoes as any, {
          style: () => ({ color: 'grey', weight: 2 }),
        }).bindPopup(function (layer: any) {
          return setPopupMessage(layer.feature.properties);
        }),

        Trechos: geoJSON(trechos as any, {
          style: () => ({ color: 'sandybrown', weight: 2 }),
        }).bindPopup(function (layer: any) {
          return `${layer.feature.properties.objeto__n1} | ${layer.feature.properties.area_m2} m²`;
        }),
      },
    };
  }

  envLicensing() {
    this.getLayer('environmentalLicensing', {
      radius: 1,
      color: 'magenta',
      weight: 2,
    });
  }

  urbanLicensing() {
    this.getLayer('urbanLicensing', { radius: 1, color: 'cyan', weight: 2 });
  }

  soilUsage(soilCategory?: string) {
    this.getLayer(
      'soilUsage',
      { color: 'darkcyan', weight: 2 },
      { soilCategory },
      true
    );
  }

  builtArea() {
    this.getLayer(
      'builtArea',
      {
        fillColor: 'black',
        color: 'black',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      },
      {},
      true
    );
  }

  nonBuiltArea() {
    this.getLayer(
      'nonBuiltArea',
      {
        fillColor: 'white',
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      },
      {},
      true
    );
  }

  private getLayer(layer: string, style: any, filter?: any, isGeoJson = false) {
    const features = this.getActiveLayers();
    if (!features || features.length === 0) {
      return;
    }

    const searchAreas = features.map((feature) => feature.geometry);

    const body = {
      layer: layer,
      searchAreas: searchAreas,
      buffer: this.buffer,
      filter,
    };

    const options = {
      headers: {
        Authorization: `Bearer ${environment.jwtToken}`,
      },
    };

    this.http
      .post<any>(`${environment.apiUrl}`, body, options)
      .subscribe((data) => {
        if (!isGeoJson) {
          const circles = data[layer].map((info: any) => {
            return circle(
              [info.geometry.coordinates[1], info.geometry.coordinates[0]],
              style
            ).bindPopup(setPopupMessage(info.properties));
          });

          this.layers.push(...circles);
        } else {
          const geoJsons = data[layer].map((info: any) => {
            return geoJSON(info as any, {
              style: () => style,
            }).bindPopup(setPopupMessage(info.properties));
          });

          this.layers.push(...geoJsons);
        }
      });
  }

  private getActiveLayers(): any[] | null {
    const features: any[] = [];

    if (this.layersControl.overlays.Macrozona._map) {
      console.log('macro');
      features.push(...macrozona.features);
    }

    if (this.layersControl.overlays['Zona parque']._map) {
      console.log('zona');
      features.push(...zona.features);
    }

    if (this.layersControl.overlays.Corredores._map) {
      console.log('corredores');
      features.push(...corredores.features);
    }

    if (this.layersControl.overlays.Infiltrações._map) {
      console.log('infiltrações');
      features.push(...infiltracoes.features);
    }

    if (this.layersControl.overlays.Trechos._map) {
      console.log('trechos');
      features.push(...trechos.features);
    }

    return features;
  }

  clearLayers() {
    this.layers = [];
  }
}

function setPopupMessage(properties: any[]): string {
  let popupMessage = '';
  for (const [key, value] of Object.entries(properties)) {
    popupMessage = popupMessage + `${key}: ${value}<br />`;
  }

  return popupMessage;
}
