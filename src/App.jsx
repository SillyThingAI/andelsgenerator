import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Calendar, Copy, Zap } from "lucide-react";

// API-slutpunkter
const SVENSKA_SPEL_API = "https://corsproxy.io/?https://api.spela.svenskaspel.se/multifetch?urls=/draw/1/stryktipset/draws";
const SPORTS_DB_API_KEY = "1"; // Gratis API-nyckel från TheSportsDB
const SPORTS_DB_SEARCH_API = (teamName) => `https://corsproxy.io/?https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_API_KEY}/searchteams.php?t=${teamName}`;
const SPORTS_DB_LAST_EVENTS_API = (teamId) => `https://corsproxy.io/?https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_API_KEY}/eventslast.php?id=${teamId}`;

// Översättningstabell för lagnamn från Svenska Spel till fullständiga namn
const teamNameMapping = {
  // Svenska lag
  "Halmstad": "Halmstads BK",
  "Sirius": "IK Sirius",
  "Kalmar": "Kalmar FF",
  "Elfsborg": "IF Elfsborg",
  "Malmö FF": "Malmö FF",
  "AIK": "AIK Fotboll",
  "Hammarby": "Hammarby IF",
  "Djurgårde": "Djurgårdens IF",
  "Göteborg": "IFK Göteborg",
  "Häcken": "BK Häcken",
  "Norrköpi": "IFK Norrköping",
  "Värnamo": "IFK Värnamo",

  // Engelska lag - Premier League
  "Man City": "Manchester City",
  "Liverpool": "Liverpool",
  "Arsenal": "Arsenal",
  "Man U": "Manchester United",
  "Tottenham": "Tottenham Hotspur",
  "Newcastle": "Newcastle United",
  "Brighton": "Brighton & Hove Albion",
  "Chelsea": "Chelsea",
  "Aston V": "Aston Villa",
  "Crystal P": "Crystal Palace",
  "Wolves": "Wolverhampton Wanderers",
  "Fulham": "Fulham",
  "Brentford": "Brentford",
  "Everton": "Everton",
  "Nottingham": "Nottingham Forest",
  "West Ham": "West Ham United",
  "Bournemou": "AFC Bournemouth",
  "Luton": "Luton Town",

  // Engelska lag - Championship
  "Middlesbr": "Middlesbrough",
  "Norwich": "Norwich City",
  "Leicester": "Leicester City",
  "Ipswich": "Ipswich Town",
  "Leeds": "Leeds United",
  "Southampt": "Southampton",
  "Coventry": "Coventry City",
  "Hull": "Hull City",
  "Sunderland": "Sunderland",
  "Cardiff": "Cardiff City",
  "Bristol C": "Bristol City",
  "Blackburn": "Blackburn Rovers",
  "Stoke": "Stoke City",
  "Swansea": "Swansea City",
  "Watford": "Watford",
  "Preston": "Preston North End",
  "Millwall": "Millwall",
  "Plymouth": "Plymouth Argyle",
  "West Brom": "West Bromwich Albion",
  "QPR": "Queens Park Rangers",
  "Sheff W": "Sheffield Wednesday",
  "Sheff U": "Sheffield United",

  // Engelska lag - League One & Two
  "Portsmout": "Portsmouth",
  "Derby": "Derby County",
  "Bolton": "Bolton Wanderers",
  "Peterboro": "Peterborough United",
  "Oxford": "Oxford United",
  "Barnsley": "Barnsley",
  "Blackpool": "Blackpool",
  "Stevenage": "Stevenage FC",
  "Wycombe": "Wycombe Wanderers",
  "Lincoln": "Lincoln City",
  "Burton": "Burton Albion",
  "Bristol R": "Bristol Rovers",
  "Exeter": "Exeter City",
  "Northampt": "Northampton Town",
  "Doncaster": "Doncaster Rovers",
  "Bradford": "Bradford City",
  "Stockport": "Stockport County",
  "Mansfield": "Mansfield Town",
  "Wrexham": "Wrexham",
  "Crewe": "Crewe Alexandra",
  "Barrow": "Barrow",
  "Rotherham": "Rotherham United"
};

const App = () => {
  const [date, setDate] = useState("");
  const [generatedTips, setGeneratedTips] = useState([]);
  const [generatedMatches, setGeneratedMatches] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const getTeamForm = async (teamName) => {
    try {
      const searchName = teamNameMapping[teamName] || teamName;
      
      const searchResponse = await fetch(SPORTS_DB_SEARCH_API(searchName));
      if (!searchResponse.ok) return 0;
      const searchData = await searchResponse.json();

      if (!searchData.teams || searchData.teams.length === 0) {
        console.warn(`Laget hittades inte i TheSportsDB: ${searchName}`);
        return 0;
      }
      
      const teamId = searchData.teams[0].idTeam;
      const eventsResponse = await fetch(SPORTS_DB_LAST_EVENTS_API(teamId));
      if (!eventsResponse.ok) return 0;
      const eventsData = await eventsResponse.json();

      let formScore = 0;
      if (eventsData.results) {
        eventsData.results.slice(0, 5).forEach(event => {
          const homeScore = parseInt(event.intHomeScore, 10);
          const awayScore = parseInt(event.intAwayScore, 10);
          
          if (homeScore > awayScore && event.idHomeTeam === teamId) {
            formScore += 3;
          } else if (awayScore > homeScore && event.idAwayTeam === teamId) {
            formScore += 3;
          } else if (homeScore === awayScore) {
            formScore += 1;
          }
        });
      }
      return formScore;
    } catch (error) {
      console.error(`Kunde inte hämta trendform för laget: ${teamName}`, error);
      return 0;
    }
  };

  const generateStryktips = async () => {
    setIsGenerating(true);
    setGeneratedTips([]);
    setGeneratedMatches([]);

    try {
      const response = await fetch(SVENSKA_SPEL_API);
      if (!response.ok) {
        throw new Error("Kunde inte hämta data från Svenska Spels API.");
      }
      const data = await response.json();

      const events = data.responses[0].draws[0].drawEvents;
      if (!events || events.length === 0) {
        throw new Error("Hittade inga matcher för Stryktipset. Kontrollera omgången.");
      }
      if (events.length < 13) {
        throw new Error(`Hittade endast ${events.length} matcher, 13 krävs.`);
      }

      const eventsWithAnalysis = await Promise.all(
        events.slice(0, 13).map(async event => {
          const { one, x, two } = event.svenskaFolket;
          const percentages = [Number(one), Number(x), Number(two)];
          const percentageDifference = Math.max(...percentages) - Math.min(...percentages);
          const sortedOptions = Object.entries({ '1': Number(one), 'X': Number(x), '2': Number(two) }).sort((a, b) => b[1] - a[1]);

          const [homeTeam, awayTeam] = event.eventDescription.split(' - ');
          const homeTeamForm = await getTeamForm(homeTeam);
          const awayTeamForm = await getTeamForm(awayTeam);
          const formDifference = Math.abs(homeTeamForm - awayTeamForm);

          const combinedScore = (percentageDifference * 0.7) + (formDifference * 0.3);
          
          return {
            ...event,
            percentageDifference,
            formDifference,
            combinedScore,
            homeTeamForm,
            awayTeamForm,
            sortedOptions,
          };
        })
      );

      const sortedByCombinedScore = [...eventsWithAnalysis].sort((a, b) => a.combinedScore - b.combinedScore);

      const helgarderingMatches = sortedByCombinedScore.slice(0, 4);
      const halvgarderingMatches = sortedByCombinedScore.slice(4, 8);
      const spikMatches = sortedByCombinedScore.slice(8);
      
      const strategyByMatchOrder = eventsWithAnalysis.map(event => {
        let type, options, tip;
        if (helgarderingMatches.find(m => m.eventDescription === event.eventDescription)) {
          type = 'Helgardering';
          options = ['1', 'X', '2'];
          tip = "1X2";
        } else if (halvgarderingMatches.find(m => m.eventDescription === event.eventDescription)) {
          type = 'Halvgardering';
          options = [event.sortedOptions[0][0], event.sortedOptions[1][0]];
          tip = options.join('');
        } else {
          type = 'Spik';
          options = [event.sortedOptions[0][0]];
          tip = options[0];
        }
        return { ...event, type, options, tip };
      });

      let allTips = [''];
      strategyByMatchOrder.forEach(match => {
        allTips = allTips.flatMap(tip => match.options.map(option => tip + option));
      });

      setGeneratedTips(allTips);
      
      const allMatchesWithTips = strategyByMatchOrder.map(match => ({
        description: match.eventDescription,
        type: match.type,
        tip: match.tip
      }));
      setGeneratedMatches(allMatchesWithTips);
      
      toast.success("Stryktipset genererat!", {
        description: `${allTips.length} rader har skapats baserat på din strategi.`,
      });

    } catch (error) {
      toast.error("Fel vid generering", {
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedTips.length === 0) {
      toast.error("Ingen rad att kopiera", {
        description: "Generera först ett Stryktips.",
      });
      return;
    }

    try {
      const copyText = generatedTips.join("\n");
      await navigator.clipboard.writeText(copyText);
      toast.success("Kopierat!", {
        description: `${generatedTips.length} rader har kopierats till urklipp.`,
      });
    } catch (err) {
      toast.error("Fel vid kopiering", {
        description: "Kunde inte kopiera till urklipp.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Stryktipset Andelsgenerator</h1>
          <p className="text-muted-foreground">
            Automatisera dina andelsspel med optimala rader baserat på din strategi
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Generera Stryktipsrad
            </CardTitle>
            <CardDescription>
              Skapar ett matematiskt system med 4 helgarderingar, 4 halvgarderingar och 5 spikar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Spelomgång datum
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              onClick={generateStryktips}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? "Genererar..." : "Generera 1296 rader (4H, 4h, 5S)"}
            </Button>

            {generatedMatches.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Genererad andelsrad</Label>
                  <p className="text-sm text-muted-foreground">
                    {generatedTips.length} unika rader har genererats.
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {generatedMatches.map((match, index) => (
                      <li key={index}>
                        **{match.tip}** - {match.description} ({match.type})
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiera alla {generatedTips.length} rader till urklipp
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Klistra in de genererade raderna direkt hos Svenska Spel</p>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default App;