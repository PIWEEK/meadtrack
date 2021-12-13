## This is the basic recipe schema for MeadTrack

It has to be flexible and yet provide some structured information so you can filter or tabulate data as well as output some nice charts.

### The recipe itself

- Main Ingredients (tabulated data. Basically honey, water and yeast). Accept flexible measure units.
- Secondary ingredients (freeform data)
- Relevant conditions (basically, type of container, temperature, etc)
- Expected result

### The process

- Preparation
- Steps (a free collection of fermentation, kegging, filtering, bottling, etc)
- Gravity measures (specific gravity measures and date)

### Utils

- Be able to delete
- Be able to clone a receipe (the recipe itself or the recipe itself AND the preparation)

## This is the MeadTrack protocol overview

### Payload (JSON format)

A mt's payload is such as

{
    "type": "payload",
    "id": 0
    "title": "a meadtrack name",
    "url": "https://xxx.xx,
    "finished": true,
    "recipe": {
        "main": {
            [
                "type": "some text",
                "quantity": 0,
                "units": "some text"
            ],
                        [
                "type": "some text",
                "quantity": 0,
                "units": "some text"
            ],
            [
                "type": "some text",
                "quantity": 0,
                "units": "some text"
            ],

        },
        "secondary": {
            [
                "name": "some text",
            ],
            [
                "name": "some text",
            ],
            [
                "name": "some text",
            ],

        }.
        "conditions": "some large text",
        "result": "some large text",
    }        
    "process": {
        "preparation": "some large text,
         "steps": {
            [
                "type": "some large text",
                "date": 2021-10-12,
            ],
            [
                "type": "some large text",
                "date": 2021-10-12,
            ],
            [
                "type": "some large text",
                "date": 2021-10-12,
            ],

        },
         "measures": {
            [
                "data": 1060.7,
                "date": 2021-10-12,
            ],
            [
                "data": 1060.7,
                "date": 2021-10-12,
            ],
            [
                "data": 1060.7,
                "date": 2021-10-12,
            ],

        },
    }
}

