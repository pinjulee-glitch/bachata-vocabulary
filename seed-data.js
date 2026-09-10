const SEED_CATEGORIES = [
  {
    "id": "cat-a2oh1g6",
    "title": "Basic",
    "moves": [
      {
        "id": "mv-cpmb84d",
        "title": "Basic",
        "note": ""
      },
      {
        "id": "mv-m4q5cac",
        "title": "Fr turn",
        "note": ""
      },
      {
        "id": "mv-t6hqr4a",
        "title": "Lr turn",
        "note": ""
      },
      {
        "id": "mv-ayq9rpn",
        "title": "Both turn inward",
        "note": "Both Lr and Fw turn inward",
        "driveId": "1j_YbVRAHWJVEJRvgf2LYeGVMASYdKzb1"
      },
      {
        "id": "mv-g4lsvsx",
        "title": "Both turn outward",
        "note": "",
        "driveId": "1QQMfGXE2HC03XK8w0xX3bFcMlv_P-wW_"
      }
    ]
  },
  {
    "id": "cat-uo1vw2c",
    "title": "Change side",
    "moves": [
      {
        "id": "mv-wua8ubg",
        "title": "Left hand turn Fr inward while changing side",
        "note": "",
        "driveId": "1MM0NJhAEIR1-OeepV9rU1SDkkKJB91rw"
      },
      {
        "id": "mv-d5gln9f",
        "title": "Open break and change side with Lr shadow cuddle position",
        "note": "Open break, change side while Lr shadow cuddle (right hand over head to front) and unwrap",
        "driveId": "1IT1cNXkcapeHJ4BGdfeqZPypPPOdjcbp"
      },
      {
        "id": "mv-rp4xdtz",
        "title": "Open break and change side with Fr shadow cuddle position",
        "note": "Open break, change side while Fr shadow cuddle (right hand over head to front) and unwrap",
        "driveId": "1hLsEiuYdl60gfCx265RDBCsap4ZyyayN"
      }
    ]
  },
  {
    "id": "cat-z5yf59d",
    "title": "On the spot",
    "moves": [
      {
        "id": "mv-2p41idt",
        "title": "Double tap (tap and slide)",
        "note": "",
        "driveId": "1mktFXR0peEGsKUo3GCJaT8E2pAbzkPXT"
      }
    ]
  },
  {
    "id": "cat-nzm7roz",
    "title": "Open hold basic steps",
    "moves": [
      {
        "id": "mv-um5x3lu",
        "title": "Madrid",
        "note": "",
        "driveId": "1G9eO3-bwELrn-W_LNKex8NyDtOvXqIFq"
      },
      {
        "id": "mv-5n9kdr9",
        "title": "Box steps",
        "note": ""
      },
      {
        "id": "mv-gzgu6j5",
        "title": "Open hold hip roll",
        "note": "",
        "driveId": "1VrYGYfFaYmEoMw7fhyNkAT74bdHhAtOL"
      }
    ]
  },
  {
    "id": "cat-dz5ypj5",
    "title": "Transition to closed hold",
    "moves": [
      {
        "id": "mv-ev68n25",
        "title": "Fr both arms up push waist turn",
        "note": "",
        "driveId": "11fNLzn98sbUGKLZzasWyNhZkCzJJgtRN"
      },
      {
        "id": "mv-3qjz5uk",
        "title": "Hair comb",
        "note": "Single hand hair comb / both hand hair comb.",
        "driveId": "1xnOz0R4P83tQ6YOGpJemQkJ6UKBND5j5"
      }
    ]
  },
  {
    "id": "cat-dmbl8gt",
    "title": "Closed hold",
    "moves": [
      {
        "id": "mv-lxkocqq",
        "title": "Break (step forward and backward)",
        "note": "",
        "driveId": "1dVvAn51KqiWJ8fyPnldFlS7LRULbwm7p"
      },
      {
        "id": "mv-w3mf04j",
        "title": "180 (walk one round)",
        "note": "",
        "driveId": "1dVvAn51KqiWJ8fyPnldFlS7LRULbwm7p"
      }
    ]
  },
  {
    "id": "cat-kqn66kk",
    "title": "Cross hand wrap to the side",
    "moves": [
      {
        "id": "mv-wyxbj6a",
        "title": "Shadow prep \u2014 two hand hold turn to side, cross hand wrap \u2014 hair comb and step forward to release",
        "note": "",
        "driveId": "1J-UUBvaX_7wIROYrkj2MQBMpxXbWUN2Z"
      }
    ]
  },
  {
    "id": "cat-uxhb7gk",
    "title": "Cuddle/Shadow on shoulder",
    "moves": [
      {
        "id": "mv-5thmnaj",
        "title": "Cuddle walk forward/backward",
        "note": ""
      },
      {
        "id": "mv-agi5ag1",
        "title": "Cuddle walk + body roll + Fr up & down",
        "note": "",
        "driveId": "1rjm5DIzq0rdj2KQ5eoOYsANx0i3Rt_Qm"
      },
      {
        "id": "mv-j16xngu",
        "title": "Cuddle walk turn (change side every 2 or 4 beats)",
        "note": "Cuddle/shadow position, walk back and forward, turn every 2 beats.",
        "driveId": "1EmqsgMW902eV2zxlWQsw782YbC6qtZdk"
      },
      {
        "id": "mv-fflk8yi",
        "title": "Cuddle backward, head under arm",
        "note": "Cuddle position - body roll - head goes backward through under the arm.",
        "driveId": "1cJYnrw1_h3LEsqiruWG1c3M3XBXjjDhJ"
      },
      {
        "id": "mv-e9ao5ue",
        "title": "Cuddle walk + side to side (hand at back) + haircomb + to the side + cross hand  wrap/haircomb/step",
        "note": "",
        "driveId": "1GChzWQ-3iJdyYSTypNr1Veld5Z68U-DI"
      },
      {
        "id": "mv-3e22g4g",
        "title": "Cuddle body roll + push back",
        "note": "",
        "driveId": "1mktFXR0peEGsKUo3GCJaT8E2pAbzkPXT"
      }
    ]
  },
  {
    "id": "cat-2jjvzdz",
    "title": "Cuddle half to the side",
    "moves": [
      {
        "id": "mv-t9ermcc",
        "title": "Cuddle turn stop half way and turn the Fr to the left, step forward",
        "note": "",
        "driveId": "1Rxgc-2OPeKBrLnfZUDO3bWynNIdgV2mc"
      },
      {
        "id": "mv-ehgnfya",
        "title": "Cuddle to side to side open",
        "note": "Break - both hand turn to cuddle - turn side to side (one hand hold) - walk pass through the back - side tap - back to basic - both outward turn.",
        "driveId": "1kvj0DaHYkChJFND3g4l8jHHoSiiAPn5a"
      }
    ]
  },
  {
    "id": "cat-5wnlpc5",
    "title": "Transition to shadow (shadow prep \u2014 left hand on top)",
    "moves": [
      {
        "id": "mv-jlk2ybr",
        "title": "Push Fr left hand down",
        "note": "",
        "driveId": "1xSGshOI33NbHblYKa44GDb797gJA9apd"
      },
      {
        "id": "mv-oc20mnz",
        "title": "Lr turn with hand release",
        "note": "Left hand turn - hand drop transition to cross hand hold - shadow position - break.",
        "driveId": "1a23ZgjUK684-xA8un6jGFXtVOxICHrtR"
      },
      {
        "id": "mv-h8b59rw",
        "title": "Two hand turn to the left to hand wraps, push left hand down",
        "note": "Shadow position - both hand hold, turn Fr to the left - Fr hair comb, drop hand (back to one hand hold) - unwind.",
        "driveId": "1GiY-IbyAEV67w7gAOrviH-on3JahFKRb"
      },
      {
        "id": "mv-vk3fra1",
        "title": "Leader inward turn hand transition",
        "note": "",
        "driveId": "1SbKKPMXjQdblFPG8PaQVZ9WsY3XkN-gf"
      },
      {
        "id": "mv-r12aato",
        "title": "Leader outward turn hand transition",
        "note": "",
        "driveId": "1uPPdHcI3sYJPUPsgk8dKSGc7fTCx2AoH"
      },
      {
        "id": "mv-egxdfsb",
        "title": "Haircomb (left hand)",
        "note": "",
        "driveId": "1MWjaHOUcS-1zwP5qQisDOQ3tOkhl69iT"
      }
    ]
  },
  {
    "id": "cat-kytkcn9",
    "title": "Shadow",
    "moves": [
      {
        "id": "mv-hhvut2g",
        "title": "Walk pass",
        "note": "Shadow to the side - walk pass through the back - turn back to face to face.",
        "driveId": "1zJ9-vcLNwyxHjm4_aY4ITYXC__IJBgcR"
      },
      {
        "id": "mv-ulfl8ru",
        "title": "Hip block + walk pass",
        "note": "Leader inward turn to cross hand hold - shadow to the side - hip block - walk pass through behind, change side - turn to face-to-face closed hold - break + 180.",
        "driveId": "11wJHyETwTv8djPbksaXsIUdtRwr6abIF"
      },
      {
        "id": "mv-2398d2j",
        "title": "Shadow position double tap",
        "note": "Shadow position - double tap - break - turn back.",
        "driveId": "1rbtjqf8odhvIhDb5Jh__CpIs7LhYDj5n"
      },
      {
        "id": "mv-2okk0wl",
        "title": "Shadow position tap and turn",
        "note": "",
        "driveId": "14QieX6inx6g9hIK4sb7SOAhtek3fZZ8F"
      },
      {
        "id": "mv-ebbllql",
        "title": "Walk side to side",
        "note": "Shadow walk straight - Fr hand steps to the left/right - hand at neck to the left/right - turn Fr to the left and hair comb - back.",
        "driveId": "1LTt6HcvDdfGeDTzi_kfkuf1YlIfXYJtx"
      }
    ]
  },
  {
    "id": "cat-fs7by2x",
    "title": "Shadow (one hand one waist)",
    "moves": [
      {
        "id": "mv-pyml5l7",
        "title": "Body roll",
        "note": "Filmed together with hip roll, in shadow position.",
        "driveId": "1Pu6za-P7__cbsbeg4Qg9Bzca7SSZXD17"
      },
      {
        "id": "mv-pysikhb",
        "title": "Hip roll",
        "note": "Filmed together with body roll, in shadow position.",
        "driveId": "1Pu6za-P7__cbsbeg4Qg9Bzca7SSZXD17"
      },
      {
        "id": "mv-g12spyb",
        "title": "Break (step forward + backward)",
        "note": "",
        "driveId": "1_IoSAY-8sj18c2VEShvQ-HrMbXhSN2Tk"
      },
      {
        "id": "mv-4eizjp6",
        "title": "Shadow position break and step",
        "note": "",
        "driveId": "1_IoSAY-8sj18c2VEShvQ-HrMbXhSN2Tk"
      }
    ]
  },
  {
    "id": "cat-6g93lky",
    "title": "Leader Shadow",
    "moves": [
      {
        "id": "mv-hsu9rrh",
        "title": "Leader shadow change hand at shoulder",
        "note": "",
        "driveId": "1zmZUS0QVT1ODcv94f3ilr9eueXvSVnNI"
      }
    ]
  },
  {
    "id": "cat-kk4n3nl",
    "title": "Open hand",
    "moves": []
  },
  {
    "id": "cat-gb7n8sa",
    "title": "Hand swings",
    "moves": [
      {
        "id": "mv-bitjbei",
        "title": "Helicopter",
        "note": "Cuddle position - unwrap to closed hold with Fr left hand up - push the upper hand down for Fr to turn with the arm extended.\nAlso drilled as: grab both hands - bring Fr right hand up - push the upper hand down toward 45\u00b0 for Fr to spin.",
        "driveId": "19D8nXKkmI4yJUB0AapTcHIxUnasjdS0E"
      },
      {
        "id": "mv-decrhd5",
        "title": "Clock swing hands (don't know the name)",
        "note": "Hair comb transition to cross hand hold - Fr clock swing (both hands).\nAlso drilled as: both hand turn right into cross hand hold - hand clock swing (both hands).",
        "driveId": "1z92eh-bPwtftZe9fJe7qtKh4daRR13Sh"
      }
    ]
  },
  {
    "id": "cat-8nv2sgz",
    "title": "Hammer locks",
    "moves": [
      {
        "id": "mv-uif0v5w",
        "title": "Double hammer lock back to back",
        "note": "Half basic - hammer lock (right hand) - back to back change position - hammer lock - unwrap.\nAlso drilled as: Fr right hand up, push left hand to the back - hammer lock (right hand) - back to back change position - hammer lock - unwrap.",
        "driveId": "1Jor2bW_-j30Fvl7rqjDbIGgQpUg5nW9v"
      },
      {
        "id": "mv-9owah4d",
        "title": "Hammer lock hip roll",
        "note": "Half Madrid - Lr outside turn - hammer lock - hip roll.",
        "driveId": "12m4Wx6EWNk4eHFA7LYNx1jNwXI7E6vtE"
      },
      {
        "id": "mv-00u1kjs",
        "title": "Hammer lock hand to back waist turn",
        "note": "Right hand turn - hammer lock to the right - push the upper hand down to both hands at the waist - hammer lock - unwrap.\nAlso drilled as: hammer lock to the left at the neck - turn right, hammer lock at the waist - swing the upper hand to the back, both hands at the back and twist - waist turn right.",
        "driveId": "1sEnttgDk_nhurzogq-0_09H0MtiqfMLQ"
      },
      {
        "id": "mv-bgip058",
        "title": "Hammer lock walk opposite",
        "note": "",
        "driveId": "1o3j_oPJbxShdedxsyAaYmz0lSnpsGVjY"
      },
      {
        "id": "mv-1wd0ivu",
        "title": "Hammer lock, throw the hand to the back, vertical hip roll",
        "note": "",
        "driveId": "13MLQ3MAdCvxt0B3L4vj-NMaZRFtsZQ3O"
      }
    ]
  },
  {
    "id": "cat-wo1u1jr",
    "title": "Chest rolls",
    "moves": [
      {
        "id": "mv-lcz344v",
        "title": "To the side",
        "note": ""
      },
      {
        "id": "mv-jxvpa3q",
        "title": "To the back",
        "note": ""
      },
      {
        "id": "mv-f2xy7wy",
        "title": "To the front",
        "note": ""
      },
      {
        "id": "mv-3jkgtqa",
        "title": "Circle",
        "note": ""
      }
    ]
  },
  {
    "id": "cat-irw4ag0",
    "title": "Head rolls (cutting neck)",
    "moves": [
      {
        "id": "mv-4odpdba",
        "title": "Head rolls (cutting neck)",
        "note": "Basic - hair comb to the back of the head - head cutting to Fr right (hand on Fr right shoulder) and Lr step right.",
        "driveId": "1AEo1jL1GWLCvO1S4sny0Df7bXpg5H50p"
      },
      {
        "id": "mv-ytfd3mq",
        "title": "Lr outside turn to cutting neck",
        "note": "Both hand turn Fr to right -  Lr outside turn unwrap - right hand to Fr right shoulder to head cutting",
        "driveId": "1Naodr5VYyIp8RLO4s6SXgQwsPK1CgYVT"
      }
    ]
  },
  {
    "id": "cat-cwkmliu",
    "title": "Underarm head-down turn",
    "moves": [
      {
        "id": "mv-r2rb57s",
        "title": "Under arm head down turn",
        "note": "",
        "driveId": "1G-zJBFIIJZyskulxPB6NfkvgQ2y4xMtp"
      },
      {
        "id": "mv-7ovlpaq",
        "title": "Under arm head down turn",
        "note": "",
        "driveId": "1oZMAEhDI_PKolYKfrArUFJST7L8FU6Mg"
      }
    ]
  },
  {
    "id": "cat-lrio08i",
    "title": "One Hand Holding",
    "moves": [
      {
        "id": "mv-1zjoetj",
        "title": "One hand body roll",
        "note": "",
        "driveId": "1-CAIiTXOwKZ49W3TZVDVVFgwGCzP3toz"
      },
      {
        "id": "mv-rab0ysk",
        "title": "One hand hold body waves",
        "note": "",
        "driveId": "1CXVrvtWlkk1LICIteQXi1eOYeKcIMpyi"
      },
      {
        "id": "mv-8sxeunk",
        "title": "Fr up and down with one hand",
        "note": "",
        "driveId": "1mApuVKvZGBSOUDAZ39C9y8li8WOi_FFA"
      },
      {
        "id": "mv-tjl3ier",
        "title": "Fr up and down",
        "note": "",
        "driveId": "19HlKr0sq3CoF20o31U3bj9tSFQ4roVLr"
      }
    ]
  },
  {
    "id": "cat-o0gek5v",
    "title": "Intro",
    "moves": [
      {
        "id": "mv-oyymzif",
        "title": "Hip roll into shadow",
        "note": "Hip roll - hug around the neck - step to the side, closed hold - look to the side, body S-roll - look to the side - chest roll - body S-roll - chest roll, Fr steps back - Fr body roll, reverse to the front and back - turn to shadow position.",
        "driveId": "1s5SYVVq3j_HARYXKQQlRLjxSuIN0JUug"
      },
      {
        "id": "mv-nblzfgp",
        "title": "Arm-up waist turn into break",
        "note": "Arm up, waist turn - closed hold - chest roll - break - body roll.",
        "driveId": "1NrWRMWK6ORBpzw41CiHRTpWDR0uV0i_L"
      }
    ]
  }
];
