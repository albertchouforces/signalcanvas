import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, Eye } from 'lucide-react';
import { useSignal } from '../context/SignalContext';

// Placeholder for practice questions
// This will be replaced with actual content later
const practiceQuestions = [
  {
    id: '1',
    question: 'Signal:',
    hint: 'Conditions for breaching are suitable',
    answerText: 'AM 3',
    answerFlags: [
      ['alfa', 'mike', 'three']
    ]
  },
  {
    id: '2',
    question: 'Signal:',
    hint: 'Make weather report',
    answerText: 'ME 9',
    answerFlags: [
      ['mike', 'echo', 'nine']
    ]
  },
  {
    id: '3',
    question: 'Signal:',
    hint: 'Fire chaff for confusion',
    answerText: '2 S',
    answerFlags: [
      ['two', 'sierra'],
    ]
  },
  {
    id: '4',
    question: 'Signal:',
    hint: 'Steer safety course',
    answerText: 'Corpen E',
    answerFlags: [
      ['corpen', 'echo']
    ]
  },
  {
    id: '5',
    question: 'Signal:',
    hint: 'Cheer ship ceremonially',
    answerText: 'AD 10-2',
    answerFlags: [
      ['alfa', 'delta', 'one', 'zero', 'tackline', 'two']
    ]
  },
  {
    id: '6',
    question: 'Signal:',
    hint: 'My boarding party is in distress',
    answerText: 'IN 4-5',
    answerFlags: [
      ['india', 'november', 'four', 'tackline', 'five']
    ]
  },
  {
    id: '7',
    question: 'Signal:',
    hint: 'Flaghoist drill exercise is complete',
    answerText: 'BB-S',
    answerFlags: [
      ['bravo', 'bravo', 'tackline', 'sierra']
    ]
  },
  {
    id: '8',
    question: 'Signal:',
    hint: 'Set mine watch commencing at 2200 and completing by 0430',
    answerText: 'MW 5-04ANS T 22',
    answerFlags: [
      ['mike', 'whiskey', 'five', 'tackline', 'zero', 'four'],
      ['alfa', 'november', 'sierra', 'tango', 'two', 'two']
    ]
  },
  {
    id: '9',
    question: 'Signal:',
    hint: 'Prepare to splice the mainbrace',
    answerText: 'Preparative AD 28',
    answerFlags: [
      ['preparative', 'alfa', 'delta', 'two', 'eight']
    ]
  },
  {
    id: '10',
    question: 'Signal:',
    hint: 'Illuminate with searchlight directed at sickbay',
    answerText: 'TA 120-1-35L',
    answerFlags: [
      ['tango', 'alfa', 'one', 'two', 'zero', 'tackline'],
      ['one', 'tackline', 'three', 'five', 'lima']
    ]
  },
  {
    id: '11',
    question: 'Signal:',
    hint: 'Weigh anchor',
    answerText: 'ED 18',
    answerFlags: [
      ['echo', 'delta', 'one', 'eight']
    ]
  },
  {
    id: '12',
    question: 'Signal:',
    hint: 'Friendly unit sunk',
    answerText: 'RE 14',
    answerFlags: [
      ['romeo', 'echo', 'one', 'four']
    ]
  },
  {
    id: '13',
    question: 'Signal:',
    hint: 'Wait for visibility conditions to improve',
    answerText: 'TA 153',
    answerFlags: [
      ['tango', 'alfa', 'one', 'five', 'three']
    ]
  },
  {
    id: '14',
    question: 'Signal:',
    hint: 'Rotating antenna without radiating RF energy',
    answerText: 'E',
    answerFlags: [
      ['echo']
    ]
  },
  {
    id: '15',
    question: 'Signal:',
    hint: 'Maintain continuous visual watch',
    answerText: 'CM 3-1',
    answerFlags: [
      ['charlie', 'mike', 'three', 'tackline', 'one']
    ]
  },
  {
    id: '16',
    question: 'Signal:',
    hint: 'I am commencing low',
    answerText: '6 S 2',
    answerFlags: [
      ['six', 'sierra', 'two']
    ]
  },
  {
    id: '17',
    question: 'Signal:',
    hint: 'Result of attack is oil',
    answerText: 'AS 6-6',
    answerFlags: [
      ['alfa', 'sierra', 'six', 'tackline', 'six']
    ]
  },
  {
    id: '18',
    question: 'Signal:',
    hint: 'Turn on search light at 0200',
    answerText: 'TA 38-2-T02',
    answerFlags: [
      ['tango', 'alfa', 'three', 'eight', 'tackline', 'two'],
      ['tackline', 'tango', 'zero', 'two']
    ]
  },
  {
    id: '19',
    question: 'Signal:',
    hint: 'Flaghoist drill exercise is completed',
    answerText: 'EX 3-4-29X',
    answerFlags: [
      ['echo', 'xray', 'three', 'tackline', 'four', 'tackline'],
      ['two', 'nine', 'xray']
    ]
  },
  {
    id: '20',
    question: 'Signal:',
    hint: 'Unable to scramble weapon-carrying helicopter',
    answerText: 'BU-AV 11',
    answerFlags: [
      ['bravo', 'uniform', 'tackline', 'alfa', 'victor', 'one'],
      ['one']
    ]
  },
  {
    id: '21',
    question: 'Signal:',
    hint: 'Sighted ships without lights',
    answerText: 'TA 30-17',
    answerFlags: [
      ['tango', 'alfa', 'three', 'zero', 'tackline', 'one'],
      ['seven']
    ]
  },
  {
    id: '22',
    question: 'Signal:',
    hint: 'Assume command as SAU Commander',
    answerText: 'AS 18',
    answerFlags: [
      ['alfa', 'sierra', 'one', 'eight']
    ]
  },
  {
    id: '23',
    question: 'Signal:',
    hint: 'Patrol channel commencing at 1200 and completed by 1730',
    answerText: 'TA 130-3-17 ANS T 12',
    answerFlags: [
      ['tango', 'alfa', 'one', 'three', 'zero', 'tackline'],
      ['three', 'tackline', 'one', 'seven', 'alfa', 'november'],
      ['sierra', 'tango', 'one', 'two']
    ]
  },
  {
    id: '24',
    question: 'Signal:',
    hint: 'If you desire set visual watch',
    answerText: 'BJ-CM 3-5',
    answerFlags: [
      ['bravo', 'juliett', 'tackline', 'charlie', 'mike', 'three'],
      ['tackline', 'five']
    ]
  },
  {
    id: '25',
    question: 'Signal:',
    hint: 'All ships turn Port together to new course 270',
    answerText: 'Turn Port 270',
    answerFlags: [
      ['turn', 'port', 'two', 'seven', 'zero']
    ]
  },
  {
    id: '26',
    question: 'Signal:',
    hint: 'All ships wheel together to Starboard to new course 180',
    answerText: 'Corpen Starboard 180',
    answerFlags: [
      ['corpen', 'starboard', 'one', 'eight', 'zero']
    ]
  },
  {
    id: '27',
    question: 'Signal:',
    hint: 'All ships turn to Starboard together to relative course 180 degrees',
    answerText: 'Turn Starboard 180',
    answerFlags: [
      ['turn', 'starboard', 'one', 'eight', 'zero']
    ]
  },
  {
    id: '28',
    question: 'Signal:',
    hint: 'Guide proceed at speed 10; other ships proceed as necessary to maintain station',
    answerText: 'Speed 10',
    answerFlags: [
      ['speed', 'one', 'zero']
    ]
  },
  {
    id: '29',
    question: 'Signal:',
    hint: 'Wheel simultaneously, each line (or unit indicated) wheel simultaneously to course 000',
    answerText: 'Corpen D 000',
    answerFlags: [
      ['corpen', 'delta', 'zero', 'zero', 'zero']
    ]
  },
  {
    id: '30',
    question: 'Signal:',
    hint: 'Prepare to splice the main brace',
    answerText: 'Preparative AD 28',
    answerFlags: [
      ['preparative', 'alfa', 'delta', 'two', 'eight']
    ]
  },
  {
    id: '31',
    question: 'Signal:',
    hint: 'I am commencing tow',
    answerText: '6 S 2',
    answerFlags: [
      ['six', 'sierra', 'two']
    ]
  },
  {
    id: '32',
    question: 'Signal:',
    hint: 'Wait for visibility conditions to improve',
    answerText: 'TA 153',
    answerFlags: [
      ['tango', 'alfa', 'one', 'five', 'three']
    ]
  },
  {
    id: '33',
    question: 'Signal:',
    hint: 'Search turn. Alter the direction of search to course 045',
    answerText: 'Corpen S 045',
    answerFlags: [
      ['corpen', 'sierra', 'zero', 'four', 'five']
    ]
  }
];

const Practice = () => {
  const { inventory } = useSignal();
  const [questions, setQuestions] = useState(practiceQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);

  // Shuffle questions when component mounts
  useEffect(() => {
    const shuffled = [...practiceQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  }, []);

  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    setIsAnswerExpanded(false);
    setCurrentIndex((prev) => (prev + 1) % questions.length);
  };

  const handlePrevious = () => {
    setShowAnswer(false);
    setIsAnswerExpanded(false);
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const expandAnswer = () => {
    setIsAnswerExpanded(true);
  };

  // Helper function to find a flag by its type
  const findFlag = (type: string) => {
    return inventory.find((flag) => flag.type === type);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-800 text-white">
        <h2 className="text-lg font-montserrat font-bold flex items-center">
          <CircleHelp className="w-5 h-5 mr-2 stroke-[2px]" />
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Practice</span>
        </h2>
      </div>

      <div className="p-4">
        {questions.length > 0 ? (
          <>
            <div className="flex justify-between mb-4">
              <span className="text-sm text-gray-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevious}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200
                           hover:scale-[1.05] active:scale-[0.95] shadow-sm hover:shadow focus:outline-none
                           focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2px]" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200
                           hover:scale-[1.05] active:scale-[0.95] shadow-sm hover:shadow focus:outline-none
                           focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2px]" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-montserrat font-semibold mb-2">{currentQuestion.question}</h3>
              <p className="text-sm font-medium text-blue-700 bg-blue-50 border-l-4 border-blue-500 pl-3 py-2 mb-4">{currentQuestion.hint}</p>

              {!showAnswer ? (
                <button
                  onClick={toggleAnswer}
                  className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                            active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                            hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Eye className="w-4 h-4 mr-2 stroke-[2.5px]" />
                  <span className="font-medium">Reveal Answer</span>
                </button>
              ) : (
                <div className="mt-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
                    <div className="font-montserrat font-medium text-blue-800 mb-3">{currentQuestion.answerText}</div>

                    {isAnswerExpanded ? (
                      <div>
                        <div className="flex items-start gap-6 mt-4 overflow-x-auto pb-2">
                          {currentQuestion.answerFlags.map((column, colIndex) => (
                            <div key={colIndex} className="flex flex-col items-center gap-1 min-w-[80px]">
                              {column.map((flagType, flagIndex) => {
                                const flag = findFlag(flagType);
                                return flag ? (
                                  <div key={flagIndex} className="flex flex-col items-center">
                                    <img
                                      src={flag.image}
                                      alt={flag.name}
                                      className="h-12 w-auto object-contain no-select no-touch-action no-drag-image"
                                      draggable={false}
                                      onContextMenu={(e) => e.preventDefault()}
                                    />
                                    <span className="text-xs text-gray-600 mt-1">{flag.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={expandAnswer}
                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 
                                 py-1.5 px-3 rounded border border-blue-200 hover:border-blue-300 bg-white
                                 hover:bg-blue-50 shadow-sm hover:shadow
                                 hover:scale-[1.02] active:scale-[0.98]
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30"
                      >
                        Show signal flags
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No practice questions available yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
