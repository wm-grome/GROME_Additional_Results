// Local-only examples. Preview frames are selected independently of timeline markers.
export const comparisons = [
  {
    "id": "entity-consistency",
    "title": "(1) Entity Consistency",
    "cases": [
      {
        "id": "case5",
        "title": "Example 1",
        "sana": "assets/dynamic-013-sana.mp4",
        "grome": "assets/dynamic-013-grome.mp4",
        "duration": 18,
        "markers": {
          "sana": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 6,
              "state": "inconsistent"
            },
            {
              "time": 12,
              "state": "inconsistent"
            }
          ],
          "grome": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 6,
              "state": "consistent"
            },
            {
              "time": 12,
              "state": "consistent"
            }
          ]
        },
        "frames": {
          "sana": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case5-sana-selected-0s.jpg"
            },
            {
              "time": 9,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case5-sana-selected-9s.jpg"
            },
            {
              "time": 12.5,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case5-sana-selected-12p5s.jpg"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case5-grome-selected-0s.jpg"
            },
            {
              "time": 9,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case5-grome-selected-9s.jpg"
            },
            {
              "time": 12.5,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case5-grome-selected-12p5s.jpg"
            }
          ]
        }
      },
      {
        "id": "case6",
        "title": "Example 2",
        "sana": "assets/dynamic-001__row021-sana.mp4",
        "grome": "assets/dynamic-001__row021-grome.mp4",
        "duration": 18,
        "markers": {
          "sana": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 7,
              "state": "inconsistent"
            },
            {
              "time": 17,
              "state": "inconsistent"
            }
          ],
          "grome": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 7,
              "state": "consistent"
            },
            {
              "time": 17,
              "state": "consistent"
            }
          ]
        },
        "frames": {
          "sana": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case6-sana-selected-0s.jpg"
            },
            {
              "time": 9,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case6-sana-selected-9s.jpg"
            },
            {
              "time": 17,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case6-sana-selected-17s.jpg"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case6-grome-selected-0s.jpg"
            },
            {
              "time": 9,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case6-grome-selected-9s.jpg"
            },
            {
              "time": 17,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case6-grome-selected-17s.jpg"
            }
          ]
        }
      },
      {
        "id": "case7",
        "title": "Example 3",
        "sana": "assets/dynamic-016-sana.mp4",
        "grome": "assets/dynamic-016-grome.mp4",
        "duration": 18,
        "markers": {
          "sana": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 7,
              "state": "inconsistent"
            },
            {
              "time": 12,
              "state": "inconsistent"
            }
          ],
          "grome": [
            {
              "time": 3,
              "state": "anchor"
            },
            {
              "time": 7,
              "state": "consistent"
            },
            {
              "time": 12,
              "state": "consistent"
            }
          ]
        },
        "frames": {
          "sana": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case7-sana-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case7-sana-selected-6p5s.jpg"
            },
            {
              "time": 12,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case7-sana-selected-12s.jpg"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case7-grome-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case7-grome-selected-6p5s.jpg"
            },
            {
              "time": 12,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case7-grome-selected-12s.jpg"
            }
          ]
        }
      }
    ]
  },
  {
    "id": "scene-consistency",
    "title": "(2) Scene Consistency",
    "cases": [
      {
        "id": "case8",
        "title": "Example 4",
        "sana": "assets/scene-living-021-sana.mp4",
        "grome": "assets/scene-living-021-grome.mp4",
        "duration": 15,
        "durations": {
          "sana": 15,
          "grome": 15
        },
        "markers": {
          "sana": [
            {
              "time": 0,
              "state": "anchor"
            },
            {
              "time": 9,
              "state": "inconsistent"
            },
            {
              "time": 14,
              "state": "inconsistent"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor"
            },
            {
              "time": 9,
              "state": "consistent"
            },
            {
              "time": 14,
              "state": "consistent"
            }
          ]
        },
        "frames": {
          "sana": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case8-sana-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case8-sana-selected-6p5s.jpg"
            },
            {
              "time": 14.75,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case8-sana-selected-14p75s.jpg"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case8-grome-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case8-grome-selected-6p5s.jpg"
            },
            {
              "time": 14.75,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case8-grome-selected-14p75s.jpg"
            }
          ]
        }
      },
      {
        "id": "case10",
        "title": "Example 5",
        "sana": "assets/scene-dining-021-sana.mp4",
        "grome": "assets/scene-dining-021-grome.mp4",
        "duration": 15,
        "durations": {
          "sana": 15,
          "grome": 15
        },
        "markers": {
          "sana": [
            {
              "time": 0,
              "state": "anchor"
            },
            {
              "time": 6,
              "state": "inconsistent"
            },
            {
              "time": 14,
              "state": "inconsistent"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor"
            },
            {
              "time": 6,
              "state": "consistent"
            },
            {
              "time": 14,
              "state": "consistent"
            }
          ]
        },
        "frames": {
          "sana": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case10-sana-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case10-sana-selected-6p5s.jpg"
            },
            {
              "time": 14.75,
              "state": "inconsistent",
              "thumbnail": "assets/comparison-frames/case10-sana-selected-14p75s.jpg"
            }
          ],
          "grome": [
            {
              "time": 0,
              "state": "anchor",
              "thumbnail": "assets/comparison-frames/case10-grome-selected-0s.jpg"
            },
            {
              "time": 6.5,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case10-grome-selected-6p5s.jpg"
            },
            {
              "time": 14.75,
              "state": "consistent",
              "thumbnail": "assets/comparison-frames/case10-grome-selected-14p75s.jpg"
            }
          ]
        }
      }
    ]
  }
];

export const nonRigid = [
  {
    "id": "revisit-consistency",
    "grid": true,
    "cases": [
      {
        "id": "non-rigid-case1",
        "title": "Example 1",
        "video": "assets/fluid-002-15s.mp4",
        "duration": 15,
        "markers": [
          {
            "time": 3,
            "state": "anchor",
            "thumbnail": "assets/comparison-frames/non-rigid-case1-scene-3s.jpg"
          },
          {
            "time": 8,
            "state": "revisit",
            "thumbnail": "assets/comparison-frames/non-rigid-case1-scene-8s.jpg"
          }
        ],
        "revisitEvidence": {
          "region": "Fountain and adjacent pond",
          "outOfViewAt": 6
        }
      },
      {
        "id": "non-rigid-case2",
        "title": "Example 2",
        "video": "assets/fluid-004.mp4",
        "duration": 18.541666666666668,
        "markers": [
          {
            "time": 3,
            "state": "anchor",
            "thumbnail": "assets/comparison-frames/non-rigid-case2-scene-3s.jpg"
          },
          {
            "time": 17.5,
            "state": "revisit",
            "thumbnail": "assets/comparison-frames/non-rigid-case2-scene-17p5s.jpg"
          }
        ],
        "revisitEvidence": {
          "region": "Waterfall and basin",
          "outOfViewAt": 13
        }
      }
    ]
  }
];
